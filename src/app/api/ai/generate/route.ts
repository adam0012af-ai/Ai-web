import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { verifyCsrf } from '@/lib/security/csrf';
import { getUserAiAllowance } from '@/lib/ai/limits';
import {
  enforceRateLimit,
  RateLimitError,
} from '@/lib/security/rate-limit';
import { requestFingerprint } from '@/lib/security/request';
import { routeAI } from '@/lib/ai/router';
import { promptForFeature } from '@/lib/ai/prompts';
import { toolBySlug } from '@/data/ai-tools';
import { db } from '@/lib/db';

const imageSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z.string().min(100).max(3_700_000),
});

const schema = z.object({
  feature: z.string().min(1).max(40),
  input: z.string().trim().min(1).max(30000),
  images: z.array(imageSchema).max(1).optional(),
});

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json(
      { error: 'Invalid request token' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    await Promise.all([
      enforceRateLimit(
        await requestFingerprint('ai-minute', user.id),
        12,
        60,
      ),
      enforceRateLimit(await requestFingerprint('ai-ip'), 40, 60),
      enforceRateLimit(
        await requestFingerprint('ai-hour', user.id),
        180,
        3600,
      ),
    ]);

    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Check your input or image size.' },
        { status: 400 },
      );
    }

    if (
      !toolBySlug(parsed.data.feature) ||
      parsed.data.feature === 'chat'
    ) {
      return NextResponse.json(
        { error: 'Unknown AI feature.' },
        { status: 404 },
      );
    }

    await enforceRateLimit(
      `ai-feature:${user.id}:${parsed.data.feature}`,
      8,
      60,
    );

    const allowance = await getUserAiAllowance(user.id);

    if (allowance.remaining <= 0) {
      return NextResponse.json(
        {
          error: `Daily ${allowance.plan} plan AI limit reached.`,
        },
        { status: 429 },
      );
    }

    if (parsed.data.input.length > allowance.maxPromptChars) {
      return NextResponse.json(
        {
          error: `This plan supports up to ${allowance.maxPromptChars.toLocaleString()} characters per request.`,
        },
        { status: 413 },
      );
    }

    const images =
      parsed.data.feature === 'image' ? parsed.data.images : undefined;

    if (parsed.data.feature === 'image') {
      if (!images?.length) {
        return NextResponse.json(
          { error: 'Choose an image to analyze.' },
          { status: 400 },
        );
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const imageUsage = await db.aIUsage.count({
        where: {
          userId: user.id,
          feature: 'image',
          status: 'SUCCESS',
          createdAt: { gte: start },
        },
      });

      if (imageUsage >= allowance.imageAnalysesDaily) {
        return NextResponse.json(
          {
            error: `Your plan includes ${allowance.imageAnalysesDaily} image analyses per day.`,
          },
          { status: 429 },
        );
      }
    }

    const result = await routeAI({
      userId: user.id,
      feature: parsed.data.feature,
      messages: [
        {
          role: 'system',
          content: promptForFeature(parsed.data.feature),
        },
        {
          role: 'user',
          content: parsed.data.input,
        },
      ],
      images,
      cacheable:
        !images?.length &&
        ['summarizer', 'analysis', 'seo'].includes(parsed.data.feature),
    });

    return NextResponse.json({
      text: result.text,
      fallbackUsed: result.fallbackUsed,
      cached: result.cached ?? false,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 },
      );
    }

    console.error('[AI GENERATE]', error);

    return NextResponse.json(
      {
        error: 'The AI service is temporarily unavailable. Please try again.',
      },
      { status: 503 },
    );
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getUserAiAllowance } from '@/lib/ai/limits';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { generateImage } from '@/lib/media/openrouter';
import { verifyCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, RateLimitError } from '@/lib/security/rate-limit';
import { requestFingerprint } from '@/lib/security/request';

export const runtime = 'nodejs';
export const maxDuration = 180;

const referenceSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z.string().min(100).max(3_700_000),
});

const schema = z.object({
  title: z.string().trim().min(2).max(120).optional().default('Nexa image'),
  prompt: z.string().trim().min(3).max(12_000),
  projectId: z.string().trim().min(1).max(80).nullable().optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('1:1'),
  resolution: z.enum(['512', '1K', '2K', '4K']).default('1K'),
  quality: z.enum(['auto', 'low', 'medium', 'high']).default('auto'),
  mode: z.enum(['fast', 'balanced', 'quality']).default('balanced'),
  outputFormat: z.enum(['png', 'jpeg', 'webp']).default('png'),
  reference: referenceSchema.optional(),
  confirmSpend: z.literal(true),
});

function safeCost(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let jobId: string | null = null;

  try {
    await Promise.all([
      enforceRateLimit(await requestFingerprint('image-generate', user.id), 3, 60),
      enforceRateLimit(await requestFingerprint('image-generate-ip'), 8, 60),
    ]);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Check the image prompt and generation settings.' },
        { status: 400 },
      );
    }

    const allowance = await getUserAiAllowance(user.id);
    if (allowance.remaining <= 0) {
      return NextResponse.json({ error: 'Your daily AI limit has been reached.' }, { status: 429 });
    }

    let projectId: string | null = null;
    if (parsed.data.projectId) {
      const project = await db.project.findFirst({
        where: {
          id: parsed.data.projectId,
          userId: user.id,
          archived: false,
        },
        select: { id: true },
      });

      if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
      projectId = project.id;
    }

    const job = await db.mediaJob.create({
      data: {
        userId: user.id,
        projectId,
        kind: 'IMAGE',
        operation: parsed.data.reference ? 'IMAGE_TO_IMAGE' : 'TEXT_TO_IMAGE',
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        status: 'PROCESSING',
        progress: 10,
        provider: 'OPENROUTER',
        settings: {
          aspectRatio: parsed.data.aspectRatio,
          resolution: parsed.data.resolution,
          quality: parsed.data.quality,
          mode: parsed.data.mode,
          outputFormat: parsed.data.outputFormat,
          hasReference: Boolean(parsed.data.reference),
        },
        attempts: 1,
        startedAt: new Date(),
      },
    });
    jobId = job.id;

    const started = Date.now();
    const result = await generateImage({
      prompt: parsed.data.prompt,
      aspectRatio: parsed.data.aspectRatio,
      resolution: parsed.data.resolution,
      quality: parsed.data.quality,
      mode: parsed.data.mode,
      outputFormat: parsed.data.outputFormat,
      reference: parsed.data.reference,
    });
    const latency = Date.now() - started;
    const cost = safeCost(result.cost);

    await Promise.all([
      db.mediaJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          model: result.model,
          completedAt: new Date(),
          result: {
            outputCount: result.images.length,
            mediaTypes: result.images.map((image) => image.mediaType),
            cost,
            transientOutput: true,
          },
        },
      }),
      db.aIUsage.create({
        data: {
          userId: user.id,
          provider: 'OPENROUTER',
          model: result.model,
          feature: 'image-generation',
          status: 'SUCCESS',
          latency,
        },
      }),
      db.activityLog.create({
        data: {
          userId: user.id,
          action: 'IMAGE_GENERATED',
          entity: 'MediaJob',
          entityId: job.id,
          metadata: {
            model: result.model,
            cost,
            aspectRatio: parsed.data.aspectRatio,
            resolution: parsed.data.resolution,
            reference: Boolean(parsed.data.reference),
          },
        },
      }),
    ]);

    return NextResponse.json({
      jobId: job.id,
      model: result.model,
      cost,
      images: result.images,
      persistence: 'transient',
    });
  } catch (error) {
    if (jobId) {
      await db.mediaJob
        .update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            progress: 0,
            error: error instanceof Error ? error.message.slice(0, 1000) : 'Image generation failed.',
            completedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many image requests. Try again shortly.' }, { status: 429 });
    }

    console.error('[IMAGE GENERATE]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && !/bearer|api[_ -]?key|token/i.test(error.message)
            ? error.message
            : 'Image generation is temporarily unavailable.',
      },
      { status: 502 },
    );
  }
}

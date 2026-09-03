import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getUserAiAllowance } from '@/lib/ai/limits';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { submitVideo } from '@/lib/media/openrouter';
import { verifyCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, RateLimitError } from '@/lib/security/rate-limit';
import { requestFingerprint } from '@/lib/security/request';

export const runtime = 'nodejs';
export const maxDuration = 90;

const schema = z.object({
  title: z.string().trim().min(2).max(120).optional().default('Nexa video'),
  prompt: z.string().trim().min(3).max(12_000),
  projectId: z.string().trim().min(1).max(80).nullable().optional(),
  duration: z.number().int().min(4).max(12).default(4),
  resolution: z.enum(['720p', '1080p']).default('720p'),
  aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
  generateAudio: z.boolean().default(false),
  mode: z.enum(['fast', 'balanced', 'quality']).default('fast'),
  confirmSpend: z.literal(true),
});

function externalError(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return null;
}

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let localJobId: string | null = null;

  try {
    await Promise.all([
      enforceRateLimit(await requestFingerprint('video-generate', user.id), 2, 300),
      enforceRateLimit(await requestFingerprint('video-generate-ip'), 4, 300),
    ]);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Check the video prompt and generation settings.' }, { status: 400 });
    }

    const allowance = await getUserAiAllowance(user.id);
    if (allowance.remaining <= 0) {
      return NextResponse.json({ error: 'Your daily AI limit has been reached.' }, { status: 429 });
    }

    let projectId: string | null = null;
    if (parsed.data.projectId) {
      const project = await db.project.findFirst({
        where: { id: parsed.data.projectId, userId: user.id, archived: false },
        select: { id: true },
      });
      if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
      projectId = project.id;
    }

    const localJob = await db.mediaJob.create({
      data: {
        userId: user.id,
        projectId,
        kind: 'VIDEO',
        operation: 'TEXT_TO_VIDEO',
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        status: 'PROCESSING',
        progress: 5,
        provider: 'OPENROUTER',
        settings: {
          duration: parsed.data.duration,
          resolution: parsed.data.resolution,
          aspectRatio: parsed.data.aspectRatio,
          generateAudio: parsed.data.generateAudio,
          mode: parsed.data.mode,
        },
        attempts: 1,
        startedAt: new Date(),
      },
    });
    localJobId = localJob.id;

    const started = Date.now();
    const { job, model } = await submitVideo({
      prompt: parsed.data.prompt,
      duration: parsed.data.duration,
      resolution: parsed.data.resolution,
      aspectRatio: parsed.data.aspectRatio,
      generateAudio: parsed.data.generateAudio,
      mode: parsed.data.mode,
    });
    const latency = Date.now() - started;

    const status = job.status === 'completed' ? 'COMPLETED' : job.status === 'failed' ? 'FAILED' : 'QUEUED';
    const completed = status === 'COMPLETED' || status === 'FAILED';
    const errorMessage = externalError(job.error);

    await Promise.all([
      db.mediaJob.update({
        where: { id: localJob.id },
        data: {
          status,
          progress: status === 'COMPLETED' ? 100 : status === 'FAILED' ? 0 : 15,
          model,
          error: errorMessage,
          completedAt: completed ? new Date() : null,
          result: {
            externalJobId: job.id,
            pollingUrl: job.polling_url ?? null,
            generationId: job.generation_id ?? null,
            externalStatus: job.status,
            unsignedUrls: job.unsigned_urls ?? [],
            cost: typeof job.usage?.cost === 'number' ? job.usage.cost : null,
          },
        },
      }),
      db.aIUsage.create({
        data: {
          userId: user.id,
          provider: 'OPENROUTER',
          model,
          feature: 'video-generation-submit',
          status: status === 'FAILED' ? 'FAILED' : 'SUCCESS',
          latency,
          errorCode: status === 'FAILED' ? 'VIDEO_SUBMIT_FAILED' : null,
        },
      }),
      db.activityLog.create({
        data: {
          userId: user.id,
          action: 'VIDEO_GENERATION_SUBMITTED',
          entity: 'MediaJob',
          entityId: localJob.id,
          metadata: {
            externalJobId: job.id,
            model,
            duration: parsed.data.duration,
            resolution: parsed.data.resolution,
            aspectRatio: parsed.data.aspectRatio,
            generateAudio: parsed.data.generateAudio,
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        jobId: localJob.id,
        status,
        externalStatus: job.status,
        model,
        contentUrl: status === 'COMPLETED' ? `/api/media/jobs/${localJob.id}/content` : null,
      },
      { status: 202 },
    );
  } catch (error) {
    if (localJobId) {
      await db.mediaJob
        .update({
          where: { id: localJobId },
          data: {
            status: 'FAILED',
            progress: 0,
            error: error instanceof Error ? error.message.slice(0, 1000) : 'Video generation failed.',
            completedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: 'Video generation is rate limited. Try again in a few minutes.' }, { status: 429 });
    }

    console.error('[VIDEO GENERATE]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && !/bearer|api[_ -]?key|token/i.test(error.message)
            ? error.message
            : 'Video generation is temporarily unavailable.',
      },
      { status: 502 },
    );
  }
}

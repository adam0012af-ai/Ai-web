import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getVideoJob } from '@/lib/media/openrouter';
import { enforceRateLimit, RateLimitError } from '@/lib/security/rate-limit';
import { requestFingerprint } from '@/lib/security/request';

export const runtime = 'nodejs';
export const maxDuration = 45;

type StoredResult = {
  externalJobId?: string;
  pollingUrl?: string | null;
  generationId?: string | null;
  externalStatus?: string;
  unsignedUrls?: string[];
  cost?: number | null;
};

function asResult(value: unknown): StoredResult {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as StoredResult) : {};
}

function errorMessage(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
    return value.message;
  }
  return null;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await enforceRateLimit(await requestFingerprint('media-status', user.id), 30, 60);

    const { id } = await context.params;
    const current = await db.mediaJob.findFirst({
      where: { id, userId: user.id, kind: 'VIDEO' },
    });

    if (!current) return NextResponse.json({ error: 'Video job not found.' }, { status: 404 });

    const stored = asResult(current.result);

    if (current.status === 'COMPLETED') {
      return NextResponse.json({
        jobId: current.id,
        status: current.status,
        progress: 100,
        model: current.model,
        externalStatus: stored.externalStatus ?? 'completed',
        cost: stored.cost ?? null,
        contentUrl: `/api/media/jobs/${current.id}/content`,
      });
    }

    if (current.status === 'FAILED' || current.status === 'CANCELED') {
      return NextResponse.json({
        jobId: current.id,
        status: current.status,
        progress: 0,
        model: current.model,
        externalStatus: stored.externalStatus ?? current.status.toLowerCase(),
        error: current.error,
        contentUrl: null,
      });
    }

    if (!stored.externalJobId) {
      return NextResponse.json(
        { error: 'This media job has no external video job to poll.' },
        { status: 409 },
      );
    }

    const external = await getVideoJob(stored.externalJobId);
    const externalStatus = String(external.status ?? '').toLowerCase();

    let status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'PROCESSING';
    let progress = 45;

    if (externalStatus === 'pending' || externalStatus === 'queued') {
      status = 'QUEUED';
      progress = 20;
    } else if (externalStatus === 'in_progress' || externalStatus === 'processing' || externalStatus === 'rendering') {
      status = 'PROCESSING';
      progress = 55;
    } else if (externalStatus === 'completed') {
      status = 'COMPLETED';
      progress = 100;
    } else if (['failed', 'cancelled', 'canceled', 'expired'].includes(externalStatus)) {
      status = 'FAILED';
      progress = 0;
    }

    const cost = typeof external.usage?.cost === 'number' ? external.usage.cost : stored.cost ?? null;
    const failure = status === 'FAILED' ? errorMessage(external.error) ?? `Video generation ${externalStatus}.` : null;

    await db.mediaJob.update({
      where: { id: current.id },
      data: {
        status,
        progress,
        error: failure,
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : null,
        result: {
          ...stored,
          externalJobId: external.id || stored.externalJobId,
          pollingUrl: external.polling_url ?? stored.pollingUrl ?? null,
          generationId: external.generation_id ?? stored.generationId ?? null,
          externalStatus,
          unsignedUrls: external.unsigned_urls ?? stored.unsignedUrls ?? [],
          cost,
        },
      },
    });

    if (status === 'COMPLETED' && current.status !== 'COMPLETED') {
      await db.activityLog
        .create({
          data: {
            userId: user.id,
            action: 'VIDEO_GENERATION_COMPLETED',
            entity: 'MediaJob',
            entityId: current.id,
            metadata: {
              externalJobId: stored.externalJobId,
              model: current.model,
              cost,
            },
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json({
      jobId: current.id,
      status,
      progress,
      model: current.model,
      externalStatus,
      cost,
      error: failure,
      contentUrl: status === 'COMPLETED' ? `/api/media/jobs/${current.id}/content` : null,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many status checks. Wait a moment and try again.' }, { status: 429 });
    }

    console.error('[VIDEO STATUS]', error);
    return NextResponse.json({ error: 'Unable to refresh video generation status.' }, { status: 502 });
  }
}

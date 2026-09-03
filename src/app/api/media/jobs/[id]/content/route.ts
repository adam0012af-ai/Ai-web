import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getVideoContent } from '@/lib/media/openrouter';

export const runtime = 'nodejs';
export const maxDuration = 180;

type StoredResult = {
  externalJobId?: string;
};

function resultObject(value: unknown): StoredResult {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as StoredResult) : {};
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await context.params;
  const job = await db.mediaJob.findFirst({
    where: {
      id,
      userId: user.id,
      kind: 'VIDEO',
      status: 'COMPLETED',
    },
    select: {
      id: true,
      title: true,
      result: true,
    },
  });

  if (!job) return new Response('Completed video not found.', { status: 404 });

  const stored = resultObject(job.result);
  if (!stored.externalJobId) return new Response('Video content reference is missing.', { status: 409 });

  try {
    const external = await getVideoContent(stored.externalJobId);
    const contentType = external.headers.get('content-type') ?? 'video/mp4';
    const length = external.headers.get('content-length');
    const safeName = job.title.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]+/g, '-').slice(0, 90) || 'nexa-video';

    const responseHeaders = new Headers({
      'content-type': contentType,
      'content-disposition': `inline; filename="${safeName}.mp4"`,
      'cache-control': 'private, max-age=300',
      'accept-ranges': 'bytes',
    });

    if (length) responseHeaders.set('content-length', length);

    return new Response(external.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[VIDEO CONTENT]', error);
    return new Response('Unable to retrieve generated video.', { status: 502 });
  }
}

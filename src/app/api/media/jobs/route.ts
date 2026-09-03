import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

const kindSchema = z.enum(['IMAGE', 'VIDEO', 'AUDIO']);

const createSchema = z.object({
  kind: kindSchema,
  operation: z.string().trim().min(2).max(60),
  title: z.string().trim().min(2).max(120),
  prompt: z.string().trim().max(20000).optional().default(''),
  negativePrompt: z.string().trim().max(5000).optional().default(''),
  projectId: z.string().trim().min(1).max(80).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');
  const projectId = url.searchParams.get('project');
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50),
  );

  const parsedKind = kindSchema.safeParse(kind);

  const jobs = await db.mediaJob.findMany({
    where: {
      userId: user.id,
      ...(parsedKind.success ? { kind: parsedKind.data } : {}),
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json(
      { error: 'Invalid request token' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid media job configuration.' },
      { status: 400 },
    );
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

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found.' },
        { status: 404 },
      );
    }

    projectId = project.id;
  }

  const activeCount = await db.mediaJob.count({
    where: {
      userId: user.id,
      status: {
        in: [
          'DRAFT',
          'WAITING_PROVIDER',
          'QUEUED',
          'PROCESSING',
          'RENDERING',
        ],
      },
    },
  });

  if (activeCount >= 100) {
    return NextResponse.json(
      { error: 'Too many active media jobs. Remove old drafts first.' },
      { status: 429 },
    );
  }

  const settings = JSON.parse(JSON.stringify(parsed.data.settings));

  const job = await db.mediaJob.create({
    data: {
      userId: user.id,
      projectId,
      kind: parsed.data.kind,
      operation: parsed.data.operation,
      title: parsed.data.title,
      prompt: parsed.data.prompt || null,
      negativePrompt: parsed.data.negativePrompt || null,
      status: 'WAITING_PROVIDER',
      progress: 0,
      settings,
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: 'MEDIA_JOB_CREATED',
      entity: 'MediaJob',
      entityId: job.id,
      metadata: {
        kind: job.kind,
        operation: job.operation,
        status: job.status,
      },
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}

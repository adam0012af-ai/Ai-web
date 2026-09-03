import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(''),
  instructions: z.string().trim().max(4000).optional().default(''),
  language: z.enum(['auto', 'ar', 'en']).default('auto'),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          conversations: true,
          files: true,
          memories: true,
        },
      },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid project data.' }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: 'PROJECT_CREATED',
      entity: 'Project',
      entityId: project.id,
      metadata: { name: project.name },
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}

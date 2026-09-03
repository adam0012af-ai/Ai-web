import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  instructions: z.string().trim().max(4000).optional(),
  language: z.enum(['auto', 'ar', 'en']).optional(),
  archived: z.boolean().optional(),
});

async function ownedProject(userId: string, id: string) {
  return db.project.findFirst({
    where: { id, userId },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await ownedProject(user.id, id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid project data.' }, { status: 400 });
  }

  const updated = await db.project.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await ownedProject(user.id, id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  await db.project.delete({ where: { id } });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: 'PROJECT_DELETED',
      entity: 'Project',
      entityId: id,
      metadata: { name: project.name },
    },
  });

  return NextResponse.json({ ok: true });
}

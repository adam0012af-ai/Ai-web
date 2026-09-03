import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

const schema = z.object({
  label: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(2000),
});

export async function POST(
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

  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid memory item.' }, { status: 400 });
  }

  const memory = await db.projectMemory.create({
    data: {
      projectId: project.id,
      ...parsed.data,
    },
  });

  await db.project.update({
    where: { id: project.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ memory }, { status: 201 });
}

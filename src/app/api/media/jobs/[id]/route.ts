import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

const patchSchema = z.object({
  action: z.enum(['cancel', 'retry', 'favorite', 'rename']),
  value: z.string().trim().min(2).max(120).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const current = await db.mediaJob.findFirst({
    where: { id, userId: user.id },
  });

  if (!current) {
    return NextResponse.json(
      { error: 'Media job not found.' },
      { status: 404 },
    );
  }

  const parsed = patchSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid media job action.' },
      { status: 400 },
    );
  }

  const { action, value } = parsed.data;

  if (action === 'cancel') {
    if (current.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Completed jobs cannot be canceled.' },
        { status: 409 },
      );
    }

    const job = await db.mediaJob.update({
      where: { id },
      data: {
        status: 'CANCELED',
        error: null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ job });
  }

  if (action === 'retry') {
    const job = await db.mediaJob.update({
      where: { id },
      data: {
        status: 'WAITING_PROVIDER',
        progress: 0,
        error: null,
        startedAt: null,
        completedAt: null,
        attempts: { increment: 1 },
      },
    });

    return NextResponse.json({ job });
  }

  if (action === 'favorite') {
    const job = await db.mediaJob.update({
      where: { id },
      data: { favorite: !current.favorite },
    });

    return NextResponse.json({ job });
  }

  if (!value) {
    return NextResponse.json(
      { error: 'A new job name is required.' },
      { status: 400 },
    );
  }

  const job = await db.mediaJob.update({
    where: { id },
    data: { title: value },
  });

  return NextResponse.json({ job });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;

  const current = await db.mediaJob.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!current) {
    return NextResponse.json(
      { error: 'Media job not found.' },
      { status: 404 },
    );
  }

  await db.mediaJob.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

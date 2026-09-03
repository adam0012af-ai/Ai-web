import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; memoryId: string }> },
) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, memoryId } = await context.params;

  const memory = await db.projectMemory.findFirst({
    where: {
      id: memoryId,
      projectId: id,
      project: { userId: user.id },
    },
    select: { id: true },
  });

  if (!memory) {
    return NextResponse.json({ error: 'Memory not found.' }, { status: 404 });
  }

  await db.projectMemory.delete({ where: { id: memoryId } });

  return NextResponse.json({ ok: true });
}

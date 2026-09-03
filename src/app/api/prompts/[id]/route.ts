import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  const prompt = await db.savedPrompt.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt not found.' }, { status: 404 });
  }

  await db.savedPrompt.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

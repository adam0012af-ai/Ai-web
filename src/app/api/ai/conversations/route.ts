import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = new URL(req.url).searchParams.get('project')?.trim();

  if (projectId) {
    const owned = await db.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
        archived: false,
      },
      select: { id: true },
    });

    if (!owned) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }
  }

  const conversations = await db.conversation.findMany({
    where: {
      userId: user.id,
      ...(projectId
        ? { projectId }
        : { projectId: null }),
    },
    orderBy: [
      { pinned: 'desc' },
      { updatedAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      pinned: true,
      favorite: true,
      updatedAt: true,
    },
    take: 100,
  });

  return NextResponse.json({ conversations });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/security/csrf';

const schema = z.object({
  title: z.string().trim().min(2).max(100),
  content: z.string().trim().min(2).max(12000),
  category: z.string().trim().min(1).max(40).default('general'),
  language: z.enum(['auto', 'ar', 'en']).default('auto'),
  favorite: z.boolean().default(false),
});

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid prompt.' }, { status: 400 });
  }

  const prompt = await db.savedPrompt.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  });

  return NextResponse.json({ prompt }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { verifyCsrf } from '@/lib/security/csrf';
import { db } from '@/lib/db';

const schema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  language: z.enum(['en', 'ar']),
  responseDetail: z.enum(['concise', 'balanced', 'detailed']),
  defaultTone: z.enum(['professional', 'friendly', 'direct', 'creative']),
  codeExplanation: z.enum(['minimal', 'balanced', 'detailed']),
  emailNotifications: z.boolean(),
  productUpdates: z.boolean(),
});

export async function PATCH(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 });
  }

  const settings = await db.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...parsed.data,
    },
    update: parsed.data,
  });

  const response = NextResponse.json({ ok: true, settings });

  response.cookies.set('nexa_locale', parsed.data.language, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return response;
}

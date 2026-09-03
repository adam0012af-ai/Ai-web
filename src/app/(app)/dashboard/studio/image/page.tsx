import { cookies } from 'next/headers';

import { RealImageStudioClient } from '@/components/media/real-image-studio-client';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const projects = await db.project.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true },
    take: 100,
  });

  return <RealImageStudioClient locale={locale} projects={projects} />;
}

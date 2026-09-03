import { cookies } from 'next/headers';

import { ImageStudioClient } from '@/components/media/image-studio-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';
import { getMediaMessages } from '@/lib/media-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getMediaMessages(locale);
  const projects = await db.project.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true },
    take: 100,
  });

  return (
    <>
      <PageHeader eyebrow={t.studio.eyebrow} title={t.image.title} description={t.image.description} />
      <ImageStudioClient locale={locale} projects={projects} />
    </>
  );
}

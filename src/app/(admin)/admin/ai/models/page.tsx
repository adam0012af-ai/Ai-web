import { cookies } from 'next/headers';

import { ModelTable } from '@/components/admin/model-table';
import { PageHeader } from '@/components/dashboard/page-header';
import { getAdminMessages } from '@/lib/admin-messages';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getAdminMessages(locale).models;
  const rows = await db.aIModel.findMany({
    orderBy: [{ provider: 'asc' }, { priority: 'asc' }],
  });

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ModelTable locale={locale} rows={rows} />
    </>
  );
}

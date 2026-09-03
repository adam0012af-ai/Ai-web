import { cookies } from 'next/headers';

import { ProviderTable } from '@/components/admin/provider-table';
import { PageHeader } from '@/components/dashboard/page-header';
import { getCurrentUser } from '@/lib/auth/session';
import { getAdminMessages } from '@/lib/admin-messages';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getAdminMessages(locale).providers;
  const [rows, user] = await Promise.all([
    db.aIProviderConfig.findMany({ orderBy: { priority: 'asc' } }),
    getCurrentUser(),
  ]);

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ProviderTable
        locale={locale}
        canEdit={user?.role === 'SUPER_ADMIN'}
        rows={rows.map((row) => ({ ...row, lastError: row.lastError ?? null }))}
      />
    </>
  );
}

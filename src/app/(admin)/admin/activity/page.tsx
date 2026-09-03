import { cookies } from 'next/headers';

import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { getAdminMessages } from '@/lib/admin-messages';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const messages = getAdminMessages(locale);
  const t = messages.activity;
  const common = messages.common;
  const ar = locale === 'ar';

  const rows = await db.activityLog.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <Card className="divide-y divide-[var(--line)]" dir={ar ? 'rtl' : 'ltr'}>
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap justify-between gap-3 p-4 text-sm">
            <span>
              <b dir="ltr" className="inline-block">{row.action}</b>{' '}
              <span className="muted">{row.user?.email ?? common.system}</span>
            </span>
            <span className="muted">
              {row.createdAt.toLocaleString(ar ? 'ar-EG' : 'en-US')}
            </span>
          </div>
        ))}
      </Card>
    </>
  );
}

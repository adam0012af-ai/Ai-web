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
  const t = getAdminMessages(locale).invoices;
  const ar = locale === 'ar';
  const rows = await db.invoice.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { issuedAt: 'desc' },
    take: 100,
  });

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <Card className="divide-y divide-[var(--line)]" dir={ar ? 'rtl' : 'ltr'}>
        {rows.length ? (
          rows.map((invoice) => (
            <div key={invoice.id} className="flex flex-wrap justify-between gap-3 p-4 text-sm">
              <span>{invoice.user.email}</span>
              <b dir="ltr">
                {(invoice.amount / 100).toFixed(2)} {invoice.currency} · {invoice.status}
              </b>
            </div>
          ))
        ) : (
          <div className="muted p-8 text-center">{t.empty}</div>
        )}
      </Card>
    </>
  );
}

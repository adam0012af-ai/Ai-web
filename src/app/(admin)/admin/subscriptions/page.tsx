import { cookies } from 'next/headers';

import { PlanTable } from '@/components/admin/plan-table';
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
  const t = messages.subscriptions;
  const common = messages.common;
  const ar = locale === 'ar';

  const [rows, plans] = await Promise.all([
    db.subscription.findMany({
      include: { user: { select: { email: true } }, plan: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.plan.findMany({ orderBy: { priceMonthly: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <Card className="overflow-x-auto" dir={ar ? 'rtl' : 'ltr'}>
        <table className="w-full min-w-[700px] text-start text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="p-4">{common.user}</th>
              <th>{common.plan}</th>
              <th>{common.status}</th>
              <th>{common.started}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((subscription) => (
              <tr key={subscription.id} className="border-b border-[var(--line)] last:border-0">
                <td className="p-4">{subscription.user.email}</td>
                <td>{subscription.plan.name}</td>
                <td>{subscription.status}</td>
                <td>{subscription.startsAt.toLocaleDateString(ar ? 'ar-EG' : 'en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <PlanTable locale={locale} plans={plans} />
    </>
  );
}

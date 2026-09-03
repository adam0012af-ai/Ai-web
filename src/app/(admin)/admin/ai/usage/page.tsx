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
  const t = messages.usage;
  const common = messages.common;
  const ar = locale === 'ar';

  const rows = await db.aIUsage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { email: true } } },
  });

  function statusLabel(status: string) {
    if (status === 'SUCCESS') return common.success;
    if (status === 'FAILED') return common.failed;
    return status;
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <Card className="overflow-x-auto" dir={ar ? 'rtl' : 'ltr'}>
        <table className="w-full min-w-[1000px] text-start text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="p-4">{common.user}</th>
              <th>{common.feature}</th>
              <th>{common.provider}</th>
              <th>{common.model}</th>
              <th>{common.status}</th>
              <th>{common.latency}</th>
              <th>{common.fallback}</th>
              <th>{common.date}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-[var(--line)] last:border-0" key={row.id}>
                <td className="p-4">{row.user?.email ?? common.system}</td>
                <td>{row.feature}</td>
                <td>{row.provider}</td>
                <td className="max-w-48 truncate" dir="ltr">
                  {row.model}
                </td>
                <td>{statusLabel(row.status)}</td>
                <td>{row.latency} ms</td>
                <td>{row.fallbackUsed ? common.yes : common.no}</td>
                <td>{row.createdAt.toLocaleString(ar ? 'ar-EG' : 'en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

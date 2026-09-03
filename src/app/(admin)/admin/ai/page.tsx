import { cookies } from 'next/headers';

import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card } from '@/components/ui/card';
import { getAdminMessages } from '@/lib/admin-messages';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getAdminMessages(locale).aiOverview;
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const rows = await db.aIUsage.findMany({
    where: { createdAt: { gte: start } },
    select: {
      status: true,
      fallbackUsed: true,
      latency: true,
      provider: true,
      feature: true,
    },
  });

  const success = rows.filter((row) => row.status === 'SUCCESS').length;
  const failed = rows.length - success;
  const fallbacks = rows.filter((row) => row.fallbackUsed).length;
  const averageLatency = rows.length
    ? Math.round(rows.reduce((total, row) => total + row.latency, 0) / rows.length)
    : 0;

  const byProvider = Object.entries(
    rows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.provider] = (accumulator[row.provider] ?? 0) + 1;
      return accumulator;
    }, {}),
  );

  const byFeature = Object.entries(
    rows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.feature] = (accumulator[row.feature] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.requestsToday} value={rows.length} />
        <StatCard label={t.successful} value={success} />
        <StatCard label={t.failed} value={failed} />
        <StatCard
          label={t.fallbackRequests}
          value={fallbacks}
          detail={`${t.averageLatency} ${averageLatency} ms`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-black">{t.providerUsage}</h2>
          <div className="mt-4 space-y-3">
            {byProvider.map(([provider, count]) => (
              <div key={provider} className="flex justify-between text-sm">
                <span>{provider}</span>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-black">{t.topFeatures}</h2>
          <div className="mt-4 space-y-3">
            {byFeature.map(([feature, count]) => (
              <div key={feature} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 truncate">{feature}</span>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

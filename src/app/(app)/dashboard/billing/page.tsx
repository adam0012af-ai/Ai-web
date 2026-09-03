import { cookies } from 'next/headers';
import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getUserAiAllowance } from '@/lib/ai/limits';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );
  const p = getProductMessages(locale);
  const t = p.billing;

  const [subscription, invoices, usage] =
    await Promise.all([
      db.subscription.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.invoice.findMany({
        where: { userId: user.id },
        orderBy: { issuedAt: 'desc' },
        take: 20,
      }),
      getUserAiAllowance(user.id),
    ]);

  const planName =
    locale === 'ar' &&
    (subscription?.plan.slug === 'free' ||
      !subscription)
      ? t.free
      : subscription?.plan.name ?? t.free;

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={t.title}
        description={t.description}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <div className="muted text-xs">
            {t.currentPlan}
          </div>
          <div className="mt-2 text-3xl font-black">
            {planName}
          </div>
          <p className="muted mt-2 text-sm">
            {t.requestsToday}: {usage.used} / {usage.daily}
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="brand-gradient h-full"
              style={{
                width: `${Math.min(
                  100,
                  (usage.used /
                    Math.max(1, usage.daily)) *
                    100,
                )}%`,
              }}
            />
          </div>

          <Link
            href="/pricing"
            className="mt-5 inline-block font-bold text-[var(--brand)]"
          >
            {t.comparePlans} {locale === 'ar' ? '←' : '→'}
          </Link>
        </Card>

        <Card className="p-6">
          <div className="muted text-xs">
            {t.paymentMethod}
          </div>
          <h2 className="mt-2 text-xl font-black">
            {t.noProvider}
          </h2>
          <p className="muted mt-3 text-sm leading-6">
            {t.noProviderDescription}
          </p>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-black">
          {t.invoiceHistory}
        </h2>

        <div className="mt-3 divide-y divide-[var(--line)]">
          {invoices.length ? (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <span>
                  {invoice.description ??
                    t.subscriptionInvoice}
                </span>
                <span className="shrink-0">
                  {(invoice.amount / 100).toFixed(2)}{' '}
                  {invoice.currency} ·{' '}
                  {t.status[invoice.status]}
                </span>
              </div>
            ))
          ) : (
            <p className="muted py-5 text-sm">
              {t.noInvoices}
            </p>
          )}
        </div>
      </Card>
    </>
  );
}

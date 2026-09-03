import { cookies } from 'next/headers';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { UsageChart } from '@/components/dashboard/usage-chart';
import { aiTools, localizeTool } from '@/data/ai-tools';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getDashboardText, normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getDashboardText(locale);
  const ar = locale === 'ar';

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const weekStart = new Date(Date.now() - 6 * 86400000);
  weekStart.setHours(0, 0, 0, 0);

  const [
    today,
    conversations,
    notifications,
    subscription,
    weekUsage,
    activities,
    saved,
  ] = await Promise.all([
    db.aIUsage.count({
      where: {
        userId: user.id,
        createdAt: { gte: start },
        status: 'SUCCESS',
      },
    }),
    db.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.aIUsage.findMany({
      where: {
        userId: user.id,
        status: 'SUCCESS',
        createdAt: { gte: weekStart },
      },
      select: { createdAt: true },
    }),
    db.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.favorite.count({
      where: { userId: user.id },
    }),
  ]);

  const limit =
    (subscription?.plan.dailyRequests ?? 30) + user.aiDailyBonus;

  const chart = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getTime() + index * 86400000);
    const key = date.toISOString().slice(0, 10);

    return {
      label: date.toLocaleDateString(ar ? 'ar-EG' : 'en', {
        weekday: 'short',
      }),
      value: weekUsage.filter(
        (item) =>
          item.createdAt.toISOString().slice(0, 10) === key,
      ).length,
    };
  });

  const arrow = ar ? '←' : '→';

  return (
    <>
      <PageHeader
        eyebrow={ar ? 'مساحة العمل' : 'WORKSPACE'}
        title={`${t.overviewTitle}، ${user.name.split(' ')[0]}`}
        description={t.overviewDescription}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.aiUsageToday}
          value={today}
          detail={t.successfulRequests}
        />
        <StatCard
          label={t.remainingRequests}
          value={Math.max(0, limit - today)}
          detail={`${t.dailyPlanLimit}: ${limit}`}
        />
        <StatCard
          label={t.recentConversations}
          value={conversations.length}
          detail={t.latestThreads}
        />
        <StatCard
          label={t.currentPlan}
          value={subscription?.plan.name ?? 'Free'}
          detail={t.manageLimits}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <UsageChart data={chart} />

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black">{t.popularTools}</h2>
              <Link
                className="shrink-0 text-sm font-bold text-[var(--brand)]"
                href="/dashboard/ai"
              >
                {t.allTools}
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {aiTools.slice(0, 6).map((tool) => {
                const localized = localizeTool(tool, locale);

                return (
                  <Link
                    key={tool.slug}
                    href={
                      tool.slug === 'chat'
                        ? '/dashboard/ai/chat'
                        : `/dashboard/ai/${tool.slug}`
                    }
                    className="rounded-2xl border border-[var(--line)] p-4 transition hover:bg-black/[.025] dark:hover:bg-white/[.04]"
                  >
                    <tool.icon size={18} />
                    <div className="mt-3 text-sm font-black">
                      {localized.displayTitle}
                    </div>
                    <div className="muted mt-1 text-xs">
                      {localized.displayCategory}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">{t.recentConversations}</h2>

            <div className="mt-3 divide-y divide-[var(--line)]">
              {conversations.length ? (
                conversations.map((conversation) => (
                  <Link
                    href="/dashboard/ai/chat"
                    key={conversation.id}
                    className="flex items-center justify-between gap-4 py-4 text-sm"
                  >
                    <b className="min-w-0 truncate">
                      {conversation.title}
                    </b>
                    <span className="muted shrink-0">
                      {conversation.updatedAt.toLocaleDateString(
                        ar ? 'ar-EG' : 'en',
                      )}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="muted py-5 text-sm">
                  {t.noConversations}
                </p>
              )}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-black">{t.quickActions}</h2>

              <div className="mt-4 grid gap-2">
                <Link
                  className="rounded-xl border border-[var(--line)] p-3 text-sm font-bold"
                  href="/dashboard/ai/chat"
                >
                  {t.startChat} {arrow}
                </Link>
                <Link
                  className="rounded-xl border border-[var(--line)] p-3 text-sm font-bold"
                  href="/dashboard/ai/writer"
                >
                  {t.openWriter} {arrow}
                </Link>
                <Link
                  className="rounded-xl border border-[var(--line)] p-3 text-sm font-bold"
                  href="/dashboard/support"
                >
                  {t.getSupport} {arrow}
                </Link>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-black">{t.recentActivity}</h2>

              <div className="mt-3 space-y-3">
                {activities.length ? (
                  activities.map((activity) => (
                    <div className="text-sm" key={activity.id}>
                      <b>{activity.action}</b>
                      <div className="muted text-xs">
                        {activity.createdAt.toLocaleString(
                          ar ? 'ar-EG' : 'en',
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted text-sm">{t.noActivity}</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">{t.accountStatus}</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="muted">{t.email}</span>
                <b>
                  {user.emailVerifiedAt
                    ? t.verified
                    : t.pendingVerification}
                </b>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">{t.role}</span>
                <b>{user.role}</b>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">{t.savedContent}</span>
                <b>{saved}</b>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">{t.plan}</span>
                <b>{subscription?.plan.name ?? 'Free'}</b>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">{t.notifications}</h2>

            <div className="mt-3 space-y-4">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div key={notification.id}>
                    <div className="text-sm font-bold">
                      {notification.title}
                    </div>
                    <p className="muted mt-1 text-xs leading-5">
                      {notification.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="muted text-sm">{t.allCaughtUp}</p>
              )}
            </div>

            <Link
              className="mt-5 inline-block text-sm font-bold text-[var(--brand)]"
              href="/dashboard/notifications"
            >
              {t.viewAll}
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}

import { cookies } from 'next/headers';
import { Activity, AlertTriangle, LifeBuoy, Users } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const ar = locale === 'ar';
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [users, requests, failed, tickets, providers] = await Promise.all([
    db.user.count(),
    db.aIUsage.count({ where: { createdAt: { gte: start } } }),
    db.aIUsage.count({ where: { createdAt: { gte: start }, status: 'FAILED' } }),
    db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    db.aIProviderConfig.findMany({ orderBy: { priority: 'asc' } }),
  ]);

  const t = ar
    ? {
        eyebrow: 'لوحة الإدارة',
        title: 'مركز تشغيل Nexa AI',
        description: 'متابعة المستخدمين وحركة الذكاء الاصطناعي وصحة المزودين والدعم من مكان واحد.',
        users: 'إجمالي المستخدمين',
        requests: 'طلبات AI اليوم',
        failed: 'طلبات فاشلة',
        tickets: 'تذاكر دعم مفتوحة',
        health: 'حالة مزودي الذكاء الاصطناعي',
        priority: 'الأولوية',
        healthy: 'سليم',
        degraded: 'متراجع',
        cooldown: 'موقوف مؤقتًا',
        model: 'النموذج الافتراضي',
      }
    : {
        eyebrow: 'Admin console',
        title: 'Nexa AI Operations Center',
        description: 'Monitor users, AI traffic, provider health, and support workload from one place.',
        users: 'Total users',
        requests: 'AI requests today',
        failed: 'Failed requests',
        tickets: 'Open support tickets',
        health: 'AI provider health',
        priority: 'Priority',
        healthy: 'Healthy',
        degraded: 'Degraded',
        cooldown: 'Cooldown',
        model: 'Default model',
      };

  function statusLabel(status: string) {
    if (!ar) return status;
    if (status === 'HEALTHY') return t.healthy;
    if (status === 'DEGRADED') return t.degraded;
    if (status === 'COOLDOWN') return t.cooldown;
    return status;
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.users} value={users} icon={<Users size={18} />} />
        <StatCard label={t.requests} value={requests} icon={<Activity size={18} />} />
        <StatCard label={t.failed} value={failed} icon={<AlertTriangle size={18} />} />
        <StatCard label={t.tickets} value={tickets} icon={<LifeBuoy size={18} />} />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">{t.health}</h2>
          <span className="muted text-xs">{providers.length}</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-2xl border border-[var(--line)] p-4">
              <div className="flex items-center justify-between gap-3">
                <b>{provider.provider}</b>
                <span className="muted text-xs">
                  {t.priority} {provider.priority}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold">
                <span
                  className={`size-2 rounded-full ${
                    provider.status === 'HEALTHY'
                      ? 'bg-emerald-500'
                      : provider.status === 'DEGRADED'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                />
                {statusLabel(provider.status)}
              </div>
              <div className="muted mt-3 text-[11px] font-bold">{t.model}</div>
              <div className="muted mt-1 truncate text-xs" dir="ltr">
                {provider.defaultModel}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Activity, LifeBuoy, MonitorSmartphone } from 'lucide-react';

import { UserActions } from '@/components/admin/user-actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, actor, cookieStore] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    getCurrentUser(),
    cookies(),
  ]);

  if (!user) notFound();

  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const ar = locale === 'ar';

  const [usage, sessions, tickets] = await Promise.all([
    db.aIUsage.count({ where: { userId: id } }),
    db.session.count({ where: { userId: id, expiresAt: { gt: new Date() } } }),
    db.supportTicket.count({ where: { userId: id } }),
  ]);

  const t = ar
    ? {
        eyebrow: 'تفاصيل المستخدم',
        requests: 'طلبات الذكاء الاصطناعي',
        sessions: 'الجلسات النشطة',
        tickets: 'تذاكر الدعم',
        role: 'الدور',
        plan: 'الخطة',
        verified: 'توثيق البريد',
        status: 'الحالة',
        yes: 'موثّق',
        no: 'غير موثّق',
        suspended: 'معلّق',
        active: 'نشط',
        none: 'بدون خطة',
      }
    : {
        eyebrow: 'User detail',
        requests: 'AI requests',
        sessions: 'Active sessions',
        tickets: 'Support tickets',
        role: 'Role',
        plan: 'Plan',
        verified: 'Email verified',
        status: 'Status',
        yes: 'Yes',
        no: 'No',
        suspended: 'Suspended',
        active: 'Active',
        none: 'None',
      };

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={user.name}
        description={user.email}
        action={
          <UserActions
            id={user.id}
            role={user.role}
            suspended={Boolean(user.suspendedAt)}
            canEdit={actor?.role === 'SUPER_ADMIN'}
            locale={locale}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.requests} value={usage} icon={<Activity size={18} />} />
        <StatCard label={t.sessions} value={sessions} icon={<MonitorSmartphone size={18} />} />
        <StatCard label={t.tickets} value={tickets} icon={<LifeBuoy size={18} />} />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="muted text-xs">{t.role}</dt>
            <dd className="mt-1 font-black">{user.role}</dd>
          </div>
          <div>
            <dt className="muted text-xs">{t.plan}</dt>
            <dd className="mt-1 font-black">{user.subscriptions[0]?.plan.name ?? t.none}</dd>
          </div>
          <div>
            <dt className="muted text-xs">{t.verified}</dt>
            <dd className="mt-1">{user.emailVerifiedAt ? t.yes : t.no}</dd>
          </div>
          <div>
            <dt className="muted text-xs">{t.status}</dt>
            <dd className={`mt-1 font-bold ${user.suspendedAt ? 'text-red-600' : 'text-emerald-600'}`}>
              {user.suspendedAt ? t.suspended : t.active}
            </dd>
          </div>
        </dl>
      </Card>
    </>
  );
}

import { cookies } from 'next/headers';
import Link from 'next/link';
import { Search, ShieldCheck, UserCheck, Users } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q = '' }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const ar = locale === 'ar';

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  const [users, total, admins, active] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.user.count(),
    db.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
    db.user.count({ where: { suspendedAt: null } }),
  ]);

  const t = ar
    ? {
        eyebrow: 'إدارة الحسابات',
        title: 'المستخدمون',
        description: 'ابحث عن الحسابات، راجع حالتها، وافتح تفاصيل المستخدم لإدارة الدور والاستخدام.',
        search: 'ابحث بالاسم أو البريد الإلكتروني…',
        total: 'إجمالي المستخدمين',
        admins: 'حسابات الإدارة',
        active: 'حسابات نشطة',
        user: 'المستخدم',
        role: 'الدور',
        verified: 'البريد',
        status: 'الحالة',
        created: 'تاريخ الإنشاء',
        yes: 'موثّق',
        no: 'غير موثّق',
        suspended: 'معلّق',
        activeStatus: 'نشط',
        view: 'فتح',
        noResults: 'لا توجد حسابات مطابقة للبحث.',
      }
    : {
        eyebrow: 'Account management',
        title: 'Users',
        description: 'Search accounts, review status, and open a user to manage role and usage.',
        search: 'Search name or email…',
        total: 'Total users',
        admins: 'Admin accounts',
        active: 'Active accounts',
        user: 'User',
        role: 'Role',
        verified: 'Email',
        status: 'Status',
        created: 'Created',
        yes: 'Verified',
        no: 'Unverified',
        suspended: 'Suspended',
        activeStatus: 'Active',
        view: 'Open',
        noResults: 'No accounts match this search.',
      };

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={t.total} value={total} icon={<Users size={18} />} />
        <StatCard label={t.admins} value={admins} icon={<ShieldCheck size={18} />} />
        <StatCard label={t.active} value={active} icon={<UserCheck size={18} />} />
      </div>

      <form className="mb-5">
        <label className="surface flex h-11 w-full max-w-lg items-center gap-2 rounded-xl px-3">
          <Search size={16} className="muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t.search}
            className="min-w-0 flex-1 bg-transparent text-start text-sm outline-none"
          />
        </label>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-start">
              <th className="p-4 text-start">{t.user}</th>
              <th className="p-4 text-start">{t.role}</th>
              <th className="p-4 text-start">{t.verified}</th>
              <th className="p-4 text-start">{t.status}</th>
              <th className="p-4 text-start">{t.created}</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[var(--line)] last:border-0">
                <td className="p-4">
                  <b>{user.name}</b>
                  <div className="muted mt-1 text-xs" dir="ltr">{user.email}</div>
                </td>
                <td className="p-4">
                  <span className={`rounded-lg px-2 py-1 text-xs font-black ${user.role === 'SUPER_ADMIN' ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-black/[.04] dark:bg-white/[.05]'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">{user.emailVerifiedAt ? t.yes : t.no}</td>
                <td className="p-4">
                  <span className={user.suspendedAt ? 'text-red-600' : 'text-emerald-600'}>
                    {user.suspendedAt ? t.suspended : t.activeStatus}
                  </span>
                </td>
                <td className="p-4">{user.createdAt.toLocaleDateString(ar ? 'ar-EG' : 'en')}</td>
                <td className="p-4">
                  <Link className="font-black text-[var(--brand)]" href={`/admin/users/${user.id}`}>
                    {t.view}
                  </Link>
                </td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={6} className="muted p-8 text-center">{t.noResults}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}

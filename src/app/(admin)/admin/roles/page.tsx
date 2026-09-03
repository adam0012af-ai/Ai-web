import { cookies } from 'next/headers';
import Link from 'next/link';
import { Check, ShieldCheck, Users, X } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { normalizeLocale } from '@/lib/i18n';

export default async function Page() {
  const [cookieStore, actor] = await Promise.all([cookies(), getCurrentUser()]);
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const ar = locale === 'ar';

  const t = ar
    ? {
        eyebrow: 'الأمان والصلاحيات',
        title: 'مركز الأدوار والصلاحيات',
        description: 'الصلاحيات الفعلية المطبقة على الخادم للأدوار USER وADMIN وSUPER_ADMIN.',
        current: 'دورك الحالي',
        users: 'إدارة المستخدمين',
        openUsers: 'فتح المستخدمين',
        capability: 'الصلاحية',
        user: 'USER',
        admin: 'ADMIN',
        super: 'SUPER_ADMIN',
        workspace: 'استخدام مساحة Nexa والمحادثة والمشاريع والاستوديو وCode Studio',
        adminConsole: 'دخول لوحة الإدارة',
        suspend: 'تعليق/إعادة تفعيل المستخدمين وإعادة حد AI اليومي',
        role: 'تغيير أدوار المستخدمين',
        delete: 'حذف حساب مستخدم من لوحة الإدارة',
        providers: 'تعديل أولوية/حالة/نموذج مزودي AI',
        noteTitle: 'مبدأ الأمان',
        note: 'هذه الصلاحيات ليست مجرد إخفاء أزرار. عمليات تغيير الدور وحذف المستخدم وتعديل مزودي AI يتم التحقق منها على الخادم، وعمليات SUPER_ADMIN لا تُقبل من ADMIN العادي.',
      }
    : {
        eyebrow: 'Security & access',
        title: 'Roles & Permissions Center',
        description: 'Server-enforced capabilities for USER, ADMIN, and SUPER_ADMIN roles.',
        current: 'Your current role',
        users: 'User management',
        openUsers: 'Open users',
        capability: 'Capability',
        user: 'USER',
        admin: 'ADMIN',
        super: 'SUPER_ADMIN',
        workspace: 'Use Nexa workspace, chat, projects, studio, and Code Studio',
        adminConsole: 'Access the admin console',
        suspend: 'Suspend/reactivate users and reset daily AI usage',
        role: 'Change user roles',
        delete: 'Delete user accounts from the admin console',
        providers: 'Change AI provider status, priority, or default model',
        noteTitle: 'Security principle',
        note: 'These permissions are not just hidden buttons. Role changes, account deletion, and AI provider mutations are verified server-side, and SUPER_ADMIN operations are rejected for normal ADMIN accounts.',
      };

  const rows = [
    [t.workspace, true, true, true],
    [t.adminConsole, false, true, true],
    [t.suspend, false, true, true],
    [t.role, false, false, true],
    [t.delete, false, false, true],
    [t.providers, false, false, true],
  ] as const;

  function Mark({ enabled }: { enabled: boolean }) {
    return enabled ? (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Check size={15} />
      </span>
    ) : (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-black/[.04] text-[var(--muted)] dark:bg-white/[.05]">
        <X size={14} />
      </span>
    );
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
            <ShieldCheck size={19} />
          </span>
          <div>
            <div className="muted text-xs">{t.current}</div>
            <b>{actor?.role ?? '—'}</b>
          </div>
        </div>

        <Link
          href="/admin/users"
          className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-black"
        >
          <Users size={16} />
          {t.openUsers}
        </Link>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="p-4 text-start">{t.capability}</th>
              <th className="p-4 text-center">{t.user}</th>
              <th className="p-4 text-center">{t.admin}</th>
              <th className="p-4 text-center">{t.super}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, user, admin, superAdmin]) => (
              <tr key={label} className="border-b border-[var(--line)] last:border-0">
                <td className="p-4 font-semibold">{label}</td>
                <td className="p-4"><Mark enabled={user} /></td>
                <td className="p-4"><Mark enabled={admin} /></td>
                <td className="p-4"><Mark enabled={superAdmin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-5 max-w-4xl p-5">
        <b>{t.noteTitle}</b>
        <p className="muted mt-2 leading-7">{t.note}</p>
      </Card>
    </>
  );
}

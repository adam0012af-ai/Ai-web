import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Tags,
  Users,
} from 'lucide-react';

import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';
import { Brand } from '@/components/brand';
import type { AppLocale } from '@/lib/i18n';

const items = [
  ['Dashboard', 'الرئيسية', '/admin/dashboard', LayoutDashboard],
  ['Users', 'المستخدمون', '/admin/users', Users],
  ['Roles', 'الصلاحيات', '/admin/roles', Shield],
  ['AI overview', 'نظرة عامة على AI', '/admin/ai', Sparkles],
  ['AI providers', 'مزودو AI', '/admin/ai/providers', BrainCircuit],
  ['AI usage', 'استخدام AI', '/admin/ai/usage', Activity],
  ['AI models', 'نماذج AI', '/admin/ai/models', Sparkles],
  ['Blog', 'المدونة', '/admin/blog', FileText],
  ['Categories', 'التصنيفات', '/admin/categories', Tags],
  ['Comments', 'التعليقات', '/admin/comments', MessageSquare],
  ['Support', 'الدعم', '/admin/support', LifeBuoy],
  ['Subscriptions', 'الاشتراكات', '/admin/subscriptions', CreditCard],
  ['Invoices', 'الفواتير', '/admin/invoices', Receipt],
  ['Notifications', 'الإشعارات', '/admin/notifications', Bell],
  ['Analytics', 'التحليلات', '/admin/analytics', BarChart3],
  ['Activity', 'النشاط', '/admin/activity', Activity],
  ['Settings', 'الإعدادات', '/admin/settings', Settings],
  ['Security', 'الأمان', '/admin/security', Shield],
] as const;

export function AdminShell({
  children,
  locale,
  userName,
  role,
}: {
  children: React.ReactNode;
  locale: AppLocale;
  userName: string;
  role: string;
}) {
  const ar = locale === 'ar';

  return (
    <div className="flex min-h-screen" dir={ar ? 'rtl' : 'ltr'} lang={locale}>
      <aside
        className={`surface sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto rounded-none border-y-0 p-4 xl:block ${
          ar ? 'border-r-0' : 'border-l-0'
        }`}
      >
        <div className="px-2 py-3">
          <Brand />
        </div>

        <div className="muted mt-5 px-3 text-[10px] font-black tracking-widest">
          {ar ? 'لوحة الإدارة' : 'ADMIN CONSOLE'}
        </div>

        <nav className="mt-2 space-y-1">
          {items.map(([english, arabic, href, Icon]) => (
            <Link
              href={href}
              key={href}
              className="muted flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
            >
              <Icon size={16} />
              {ar ? arabic : english}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg)]/90 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <AdminMobileNav locale={locale} />
            <div className="min-w-0">
              <b className="block truncate">
                {ar ? 'إدارة Nexa AI' : 'Nexa AI Administration'}
              </b>
              <span className="muted hidden text-xs sm:inline">
                {userName} · {role}
              </span>
            </div>
          </div>

          <Link
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold"
            href="/dashboard"
          >
            {ar ? 'مساحة المستخدم' : 'User workspace'}
          </Link>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

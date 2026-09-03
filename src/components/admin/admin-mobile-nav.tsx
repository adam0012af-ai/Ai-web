'use client';

import { useState } from 'react';
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
  Menu,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Tags,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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

export function AdminMobileNav({ locale }: { locale: AppLocale }) {
  const [open, setOpen] = useState(false);
  const ar = locale === 'ar';

  return (
    <>
      <Button
        variant="ghost"
        className="xl:hidden"
        aria-label={ar ? 'فتح قائمة الإدارة' : 'Open admin navigation'}
        onClick={() => setOpen(true)}
      >
        <Menu size={19} />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] bg-black/45 xl:hidden"
          onClick={() => setOpen(false)}
          dir={ar ? 'rtl' : 'ltr'}
        >
          <aside
            className={`h-full w-[86%] max-w-sm overflow-y-auto bg-[var(--card)] p-4 ${
              ar ? 'ms-auto' : ''
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <b>{ar ? 'لوحة إدارة Nexa AI' : 'Nexa AI Admin Console'}</b>
              <Button
                variant="ghost"
                aria-label={ar ? 'إغلاق قائمة الإدارة' : 'Close admin navigation'}
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <nav className="space-y-1">
              {items.map(([english, arabic, href, Icon]) => (
                <Link
                  onClick={() => setOpen(false)}
                  key={href}
                  href={href}
                  className="muted flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                >
                  <Icon size={17} />
                  {ar ? arabic : english}
                </Link>
              ))}
            </nav>

            <Link
              onClick={() => setOpen(false)}
              className="mt-5 block rounded-xl border border-[var(--line)] px-3 py-3 text-center text-sm font-bold"
              href="/dashboard"
            >
              {ar ? 'العودة لمساحة المستخدم' : 'Back to workspace'}
            </Link>
          </aside>
        </div>
      ) : null}
    </>
  );
}

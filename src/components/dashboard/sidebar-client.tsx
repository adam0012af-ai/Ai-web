'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MessageSquare,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-react';

import { Brand } from '@/components/brand';
import type { AppLocale } from '@/lib/i18n';
import { getV6Messages } from '@/lib/v6-messages';
import { accountNav, dashboardNav } from './nav-items';

type RecentConversation = {
  id: string;
  title: string;
  projectId: string | null;
};

const STORAGE_KEY = 'nexa-sidebar-collapsed';

function activeFor(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/ai') {
    return pathname === href ||
      (pathname.startsWith('/dashboard/ai/') && !pathname.startsWith('/dashboard/ai/chat'));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarClient({
  locale,
  recent,
  isAdmin,
  userName,
}: {
  locale: AppLocale;
  recent: RecentConversation[];
  isAdmin: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const ar = locale === 'ar';
  const t = getV6Messages(locale).nav;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }

  const primary = dashboardNav.slice(0, 5);
  const library = dashboardNav.slice(5);
  const account = accountNav.filter(([, href]) =>
    ['/dashboard/profile', '/dashboard/settings', '/dashboard/support', '/dashboard/billing'].includes(href),
  );

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-e border-[var(--line)] bg-[var(--card)]/72 backdrop-blur-xl transition-[width] duration-200 lg:flex ${
        collapsed ? 'w-[76px] p-2' : 'w-[286px] p-3'
      }`}
      dir={ar ? 'rtl' : 'ltr'}
    >
      <div className={`flex min-h-12 items-center ${collapsed ? 'justify-center' : 'justify-between gap-2 px-2'}`}>
        {collapsed ? (
          <Link
            href="/dashboard"
            className="brand-gradient grid size-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm"
            title="Nexa AI"
          >
            N
          </Link>
        ) : (
          <Brand />
        )}

        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="muted grid size-9 place-items-center rounded-xl transition hover:bg-black/[.05] hover:text-[var(--fg)] dark:hover:bg-white/[.06]"
            aria-label={ar ? 'طي القائمة الجانبية' : 'Collapse sidebar'}
            title={ar ? 'طي القائمة' : 'Collapse sidebar'}
          >
            <PanelLeftClose size={17} />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="muted mx-auto mt-1 grid size-10 place-items-center rounded-xl transition hover:bg-black/[.05] hover:text-[var(--fg)] dark:hover:bg-white/[.06]"
          aria-label={ar ? 'فتح القائمة الجانبية' : 'Expand sidebar'}
          title={ar ? 'فتح القائمة' : 'Expand sidebar'}
        >
          <PanelLeftOpen size={18} />
        </button>
      ) : null}

      <Link
        href="/dashboard/ai/chat"
        title={collapsed ? t.newChat : undefined}
        className={`brand-gradient mt-3 flex min-h-11 items-center rounded-xl text-sm font-black text-white shadow-sm transition hover:opacity-95 ${
          collapsed ? 'justify-center px-0' : 'justify-center gap-2 px-4'
        }`}
      >
        <MessageSquarePlus size={18} />
        {!collapsed ? <span>{t.newChat}</span> : null}
      </Link>

      <nav className="mt-4 space-y-1">
        {!collapsed ? (
          <div className="muted px-3 pb-1 text-[10px] font-black uppercase tracking-[.16em]">{t.main}</div>
        ) : null}

        {primary.map(([label, href, Icon, labelAr]) => {
          const active = activeFor(pathname, href);
          const text = ar ? labelAr : label;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? text : undefined}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-10 items-center rounded-xl text-sm font-semibold transition ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                active
                  ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'muted hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]'
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed ? <span className="truncate">{text}</span> : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <nav className="mt-4 space-y-1 border-t border-[var(--line)] pt-3">
          <div className="muted px-3 pb-1 text-[10px] font-black uppercase tracking-[.16em]">
            {ar ? 'المكتبة والأدوات' : 'Library & tools'}
          </div>
          {library.map(([label, href, Icon, labelAr]) => {
            const active = activeFor(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-9 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                    : 'muted hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{ar ? labelAr : label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className={`mt-4 min-h-0 flex-1 overflow-y-auto ${collapsed ? 'hidden' : ''}`}>
        <div className="muted flex items-center gap-2 px-3 pb-2 text-[10px] font-black uppercase tracking-[.16em]">
          <MessageSquare size={13} />
          {t.recent}
        </div>

        <div className="space-y-1">
          {recent.length ? (
            recent.map((conversation) => {
              const href = conversation.projectId
                ? `/dashboard/ai/chat?project=${conversation.projectId}&conversation=${conversation.id}`
                : `/dashboard/ai/chat?conversation=${conversation.id}`;
              return (
                <Link
                  key={conversation.id}
                  href={href}
                  className="muted block truncate rounded-xl px-3 py-2 text-[13px] transition hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
                  title={conversation.title}
                >
                  {conversation.title}
                </Link>
              );
            })
          ) : (
            <p className="muted px-3 py-2 text-xs">{t.noRecent}</p>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-[var(--line)] pt-3">
        {!collapsed ? (
          <div className="muted px-3 pb-1 text-[10px] font-black uppercase tracking-[.16em]">{t.account}</div>
        ) : null}

        {account.map(([label, href, Icon, labelAr]) => {
          const active = activeFor(pathname, href);
          const text = ar ? labelAr : label;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? text : undefined}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-9 items-center rounded-xl text-sm font-semibold transition ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                active
                  ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'muted hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed ? <span className="truncate">{text}</span> : null}
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            href="/admin/dashboard"
            title={collapsed ? t.admin : undefined}
            className={`mt-1 flex min-h-10 items-center rounded-xl bg-[var(--brand)]/10 text-sm font-black text-[var(--brand)] transition hover:bg-[var(--brand)]/15 ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            }`}
          >
            <ShieldCheck size={16} className="shrink-0" />
            {!collapsed ? <span>{t.admin}</span> : null}
          </Link>
        ) : null}

        {!collapsed ? (
          <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="brand-gradient grid size-8 shrink-0 place-items-center rounded-full text-xs font-black text-white">
              {userName?.[0] ?? 'U'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">{userName}</div>
              <div className="muted text-[10px]">Nexa Workspace</div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

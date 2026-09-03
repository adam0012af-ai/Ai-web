'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, MessageSquarePlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getDashboardText } from '@/lib/i18n';
import { getV6Messages } from '@/lib/v6-messages';
import { accountNav, dashboardNav } from './nav-items';

export function MobileNav({
  locale,
}: {
  locale: AppLocale;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ar = locale === 'ar';
  const t = getDashboardText(locale);
  const v6 = getV6Messages(locale).nav;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const menu = open ? (
    <div
      className="fixed inset-0 z-[100] bg-black/60 lg:hidden"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <aside
        className={`fixed inset-y-0 z-[101] flex w-[88%] max-w-[360px] flex-col bg-[var(--card)] shadow-2xl ${
          ar
            ? 'right-0 border-l border-[var(--line)]'
            : 'left-0 border-r border-[var(--line)]'
        }`}
        onClick={(event) => event.stopPropagation()}
        aria-label={t.navigation}
        dir={ar ? 'rtl' : 'ltr'}
      >
        <div className="flex min-h-17 shrink-0 items-center justify-between border-b border-[var(--line)] px-5">
          <div>
            <div className="text-base font-extrabold">
              {t.navigation}
            </div>
            <div className="muted mt-0.5 text-xs">
              {t.workspace}
            </div>
          </div>

          <Button
            variant="ghost"
            className="size-10 p-0"
            onClick={() => setOpen(false)}
            aria-label={
              ar ? 'إغلاق القائمة' : 'Close navigation'
            }
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-3">
          <Link
            href="/dashboard/ai/chat"
            onClick={() => setOpen(false)}
            className="brand-gradient flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white"
          >
            <MessageSquarePlus size={17} />
            {v6.newChat}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-5">
          <div className="muted px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[.16em]">
            {v6.main}
          </div>
          <div className="space-y-1">
            {dashboardNav.map(([label, href, Icon, labelAr]) => (
              <Link
                onClick={() => setOpen(false)}
                key={href}
                href={href}
                className="muted flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-black/[.05] hover:text-[var(--fg)] dark:hover:bg-white/[.06]"
              >
                <Icon size={18} />
                <span>{ar ? labelAr : label}</span>
              </Link>
            ))}
          </div>

          <div className="muted mt-5 px-3 pb-1 text-[10px] font-black uppercase tracking-[.16em]">
            {v6.account}
          </div>
          <div className="space-y-1">
            {accountNav.map(([label, href, Icon, labelAr]) => (
              <Link
                onClick={() => setOpen(false)}
                key={href}
                href={href}
                className="muted flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-black/[.05] hover:text-[var(--fg)] dark:hover:bg-white/[.06]"
              >
                <Icon size={18} />
                <span>{ar ? labelAr : label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <Button
        variant="ghost"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label={ar ? 'فتح القائمة' : 'Open navigation'}
        aria-expanded={open}
      >
        <Menu size={20} />
      </Button>

      {mounted && menu
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}

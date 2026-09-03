'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { dashboardNav } from './nav-items';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        className="fixed inset-y-0 left-0 z-[101] flex w-[86%] max-w-[340px] flex-col border-r border-[var(--line)] bg-[var(--card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        aria-label="Mobile navigation"
      >
        <div className="flex min-h-17 shrink-0 items-center justify-between border-b border-[var(--line)] px-5">
          <div>
            <div className="text-base font-extrabold">Navigation</div>
            <div className="muted mt-0.5 text-xs">Nexa AI Workspace</div>
          </div>

          <Button
            variant="ghost"
            className="size-10 p-0"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="space-y-1">
            {dashboardNav.map(([label, href, Icon]) => (
              <Link
                onClick={() => setOpen(false)}
                key={href}
                href={href}
                className="muted flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-black/[.05] hover:text-[var(--fg)] dark:hover:bg-white/[.06]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-black/[.04] dark:bg-white/[.05]">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
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
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu size={20} />
      </Button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

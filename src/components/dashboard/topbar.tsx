import { Bell } from 'lucide-react';
import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';
import { getCurrentUser } from '@/lib/auth/session';
import type { AppLocale } from '@/lib/i18n';
import { CommandPalette } from './command-palette';
import { LanguageToggle } from './language-toggle';
import { LogoutButton } from './logout-button';
import { MobileNav } from './mobile-nav';

export async function Topbar({ locale }: { locale: AppLocale }) {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 flex min-h-17 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg)]/90 px-3 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav locale={locale} />
        <CommandPalette locale={locale} />
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Link
          className="relative rounded-xl p-2 hover:bg-black/[.04] dark:hover:bg-white/[.05]"
          href="/dashboard/notifications"
          aria-label={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
        >
          <Bell size={18} />
        </Link>

        <LanguageToggle locale={locale} />
        <ThemeToggle />

        <div className="hidden px-2 text-start sm:block">
          <div className="text-sm font-bold">{user?.name}</div>
          <div className="muted text-[11px]">{user?.role}</div>
        </div>

        <div className="brand-gradient grid size-9 place-items-center rounded-full text-sm font-black">
          {user?.name?.[0] ?? 'U'}
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clapperboard,
  FolderKanban,
  Home,
  MessageSquare,
  User,
} from 'lucide-react';

import type { AppLocale } from '@/lib/i18n';

export function MobileBottomNav({
  locale,
}: {
  locale: AppLocale;
}) {
  const pathname = usePathname();
  const ar = locale === 'ar';

  const items = [
    {
      href: '/dashboard',
      label: ar ? 'الرئيسية' : 'Home',
      icon: Home,
      exact: true,
    },
    {
      href: '/dashboard/ai/chat',
      label: ar ? 'المحادثة' : 'Chat',
      icon: MessageSquare,
      exact: false,
    },
    {
      href: '/dashboard/studio',
      label: ar ? 'الاستوديو' : 'Studio',
      icon: Clapperboard,
      exact: false,
    },
    {
      href: '/dashboard/projects',
      label: ar ? 'المشاريع' : 'Projects',
      icon: FolderKanban,
      exact: false,
    },
    {
      href: '/dashboard/profile',
      label: ar ? 'حسابي' : 'Profile',
      icon: User,
      exact: false,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--card)]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
      aria-label={
        ar ? 'التنقل السريع' : 'Quick navigation'
      }
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${
                active
                  ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'muted'
              }`}
            >
              <Icon size={18} />
              <span className="max-w-full truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

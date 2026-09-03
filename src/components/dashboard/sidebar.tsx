import Link from 'next/link';

import { Brand } from '@/components/brand';
import type { AppLocale } from '@/lib/i18n';
import { dashboardNav } from './nav-items';

export function Sidebar({ locale }: { locale: AppLocale }) {
  const ar = locale === 'ar';

  return (
    <aside
      className={`surface sticky top-0 hidden h-screen w-64 shrink-0 rounded-none border-y-0 p-4 lg:block ${
        ar ? 'border-r-0' : 'border-l-0'
      }`}
    >
      <div className="px-2 py-3">
        <Brand />
      </div>

      <nav className="mt-6 space-y-1">
        {dashboardNav.map(([label, href, Icon, labelAr]) => (
          <Link
            key={href}
            href={href}
            className="muted flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-black/[.035] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
          >
            <Icon size={17} />
            <span>{ar ? labelAr : label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

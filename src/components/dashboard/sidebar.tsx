import Link from 'next/link';
import { MessageSquarePlus, ShieldCheck } from 'lucide-react';

import { Brand } from '@/components/brand';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { AppLocale } from '@/lib/i18n';
import { getV6Messages } from '@/lib/v6-messages';
import { accountNav, dashboardNav } from './nav-items';

export async function Sidebar({
  locale,
}: {
  locale: AppLocale;
}) {
  const ar = locale === 'ar';
  const t = getV6Messages(locale).nav;
  const user = await getCurrentUser();

  const recent = user
    ? await db.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          projectId: true,
        },
        take: 7,
      })
    : [];

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  return (
    <aside
      className={`surface sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col rounded-none border-y-0 p-3 lg:flex ${
        ar ? 'border-r-0' : 'border-l-0'
      }`}
    >
      <div className="px-3 py-3">
        <Brand />
      </div>

      <Link
        href="/dashboard/ai/chat"
        className="brand-gradient mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white"
      >
        <MessageSquarePlus size={17} />
        {t.newChat}
      </Link>

      <nav className="mt-4 space-y-1">
        <div className="muted px-3 pb-1 text-[10px] font-black uppercase tracking-[.16em]">
          {t.main}
        </div>
        {dashboardNav.slice(0, 6).map(
          ([label, href, Icon, labelAr]) => (
            <Link
              key={href}
              href={href}
              className="muted flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
            >
              <Icon size={17} />
              <span>{ar ? labelAr : label}</span>
            </Link>
          ),
        )}
      </nav>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        <div className="muted px-3 pb-2 text-[10px] font-black uppercase tracking-[.16em]">
          {t.recent}
        </div>

        <div className="space-y-1">
          {recent.length ? (
            recent.map((conversation) => (
              <Link
                key={conversation.id}
                href={
                  conversation.projectId
                    ? `/dashboard/ai/chat?project=${conversation.projectId}&conversation=${conversation.id}`
                    : `/dashboard/ai/chat?conversation=${conversation.id}`
                }
                className="muted block truncate rounded-xl px-3 py-2 text-sm transition hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
                title={conversation.title}
              >
                {conversation.title}
              </Link>
            ))
          ) : (
            <p className="muted px-3 py-2 text-xs">
              {t.noRecent}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-[var(--line)] pt-3">
        <div className="muted px-3 pb-1 text-[10px] font-black uppercase tracking-[.16em]">
          {t.account}
        </div>

        {accountNav
          .filter(([, href]) =>
            [
              '/dashboard/profile',
              '/dashboard/settings',
              '/dashboard/support',
              '/dashboard/billing',
            ].includes(href),
          )
          .map(([label, href, Icon, labelAr]) => (
            <Link
              key={href}
              href={href}
              className="muted flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
            >
              <Icon size={16} />
              <span>{ar ? labelAr : label}</span>
            </Link>
          ))}

        {isAdmin ? (
          <Link
            href="/admin/dashboard"
            className="mt-1 flex items-center gap-3 rounded-xl bg-[var(--brand)]/10 px-3 py-2 text-sm font-black text-[var(--brand)]"
          >
            <ShieldCheck size={16} />
            {t.admin}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

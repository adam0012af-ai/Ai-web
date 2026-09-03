import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  ArrowUpRight,
  Clapperboard,
  FolderKanban,
  MessageSquare,
} from 'lucide-react';

import { SmartStart } from '@/components/dashboard/smart-start';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserAiAllowance } from '@/lib/ai/limits';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';
import { getV6Messages } from '@/lib/v6-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );
  const t = getV6Messages(locale).home;
  const ar = locale === 'ar';

  const [allowance, conversations, projects, mediaJobs] =
    await Promise.all([
      getUserAiAllowance(user.id),
      db.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          projectId: true,
          updatedAt: true,
        },
        take: 5,
      }),
      db.project.findMany({
        where: {
          userId: user.id,
          archived: false,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
        take: 4,
      }),
      db.mediaJob.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          kind: true,
          status: true,
          createdAt: true,
        },
        take: 4,
      }),
    ]);

  const firstName =
    user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div
      className="mx-auto max-w-6xl pb-8"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <section className="px-1 pb-8 pt-5 text-center sm:pt-10">
        <div className="text-xs font-black tracking-[.22em] text-[var(--brand)]">
          {t.eyebrow}
        </div>
        <div className="muted mt-4 text-sm">
          {t.greeting}، {firstName}
        </div>
        <h1 className="mx-auto mt-2 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
          {t.title}
        </h1>
        <p className="muted mx-auto mt-4 max-w-2xl text-sm leading-7 sm:text-base">
          {t.description}
        </p>

        <div className="mt-8">
          <SmartStart locale={locale} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare
                size={18}
                className="text-[var(--brand)]"
              />
              <h2 className="font-black">
                {t.continue}
              </h2>
            </div>
            <Link
              href="/dashboard/ai/chat"
              className="muted flex items-center gap-1 text-xs font-bold hover:text-[var(--brand)]"
            >
              {t.openAll}
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[var(--line)]">
            {conversations.length ? (
              conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={
                    conversation.projectId
                      ? `/dashboard/ai/chat?project=${conversation.projectId}&conversation=${conversation.id}`
                      : `/dashboard/ai/chat?conversation=${conversation.id}`
                  }
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <b className="min-w-0 truncate">
                    {conversation.title}
                  </b>
                  <span className="muted shrink-0 text-xs">
                    {conversation.updatedAt.toLocaleDateString(
                      ar ? 'ar-EG' : 'en',
                    )}
                  </span>
                </Link>
              ))
            ) : (
              <p className="muted py-6 text-sm">
                {t.noConversations}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="brand-gradient grid size-9 place-items-center rounded-xl text-xs font-black text-white">
              AI
            </div>
            <div>
              <h2 className="font-black">
                {t.usage}
              </h2>
              <p className="muted text-xs">
                {allowance.remaining} {t.remaining}
              </p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="brand-gradient h-full rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (allowance.used /
                    Math.max(1, allowance.daily)) *
                    100,
                )}%`,
              }}
            />
          </div>

          <div className="muted mt-3 flex justify-between text-xs">
            <span>{allowance.used}</span>
            <span>{allowance.daily}</span>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban
                size={18}
                className="text-[var(--brand)]"
              />
              <h2 className="font-black">{t.projects}</h2>
            </div>
            <Link
              href="/dashboard/projects"
              className="muted flex items-center gap-1 text-xs font-bold hover:text-[var(--brand)]"
            >
              {t.openAll}
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {projects.length ? (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="rounded-2xl bg-black/[.025] p-4 transition hover:bg-black/[.045] dark:bg-white/[.035] dark:hover:bg-white/[.06]"
                >
                  <b className="block truncate text-sm">
                    {project.name}
                  </b>
                  <span className="muted mt-2 block text-xs">
                    {project.updatedAt.toLocaleDateString(
                      ar ? 'ar-EG' : 'en',
                    )}
                  </span>
                </Link>
              ))
            ) : (
              <p className="muted py-5 text-sm sm:col-span-2">
                {t.noProjects}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clapperboard
                size={18}
                className="text-[var(--brand)]"
              />
              <h2 className="font-black">
                {t.recentMedia}
              </h2>
            </div>
            <Link
              href="/dashboard/studio/jobs"
              className="muted flex items-center gap-1 text-xs font-bold hover:text-[var(--brand)]"
            >
              {t.openAll}
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[var(--line)]">
            {mediaJobs.length ? (
              mediaJobs.map((job) => (
                <Link
                  href="/dashboard/studio/jobs"
                  key={job.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <b className="block truncate text-sm">
                      {job.title}
                    </b>
                    <span className="muted text-xs">
                      {job.kind}
                    </span>
                  </div>
                  <span className="muted shrink-0 text-[11px]">
                    {job.status}
                  </span>
                </Link>
              ))
            ) : (
              <p className="muted py-5 text-sm">
                {t.noMedia}
              </p>
            )}
          </div>
        </div>
      </section>

      <p className="muted mx-auto mt-5 max-w-3xl text-center text-[11px] leading-5">
        {t.studioNote}
      </p>
    </div>
  );
}

import { cookies } from 'next/headers';
import Link from 'next/link';
import { AudioLines, Clapperboard, Clock3, Film, Images, Library, Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';
import { getMediaMessages } from '@/lib/media-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getMediaMessages(locale);

  const [assets, pending, completed, recent] = await Promise.all([
    db.mediaAsset.count({ where: { userId: user.id } }),
    db.mediaJob.count({
      where: {
        userId: user.id,
        status: { in: ['DRAFT', 'WAITING_PROVIDER', 'QUEUED', 'PROCESSING', 'RENDERING'] },
      },
    }),
    db.mediaJob.count({ where: { userId: user.id, status: 'COMPLETED' } }),
    db.mediaJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const cards = [
    { href: '/dashboard/studio/video', title: t.studio.video, description: t.studio.videoDescription, icon: Film },
    { href: '/dashboard/studio/image', title: t.studio.image, description: t.studio.imageDescription, icon: Images },
    { href: '/dashboard/studio/audio', title: t.studio.audio, description: t.studio.audioDescription, icon: AudioLines },
    { href: '/dashboard/studio/library', title: t.studio.library, description: t.studio.libraryDescription, icon: Library },
    { href: '/dashboard/studio/jobs', title: t.studio.jobs, description: t.studio.jobsDescription, icon: Clock3 },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.studio.eyebrow}
        title={t.studio.title}
        description={t.studio.description}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="muted text-xs">{t.studio.mediaAssets}</div>
          <div className="mt-1 text-2xl font-black">{assets}</div>
        </Card>
        <Card className="p-4">
          <div className="muted text-xs">{t.studio.pendingJobs}</div>
          <div className="mt-1 text-2xl font-black">{pending}</div>
        </Card>
        <Card className="p-4">
          <div className="muted text-xs">{t.studio.completedJobs}</div>
          <div className="mt-1 text-2xl font-black">{completed}</div>
        </Card>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--brand)]/25 bg-[var(--brand)]/10 p-4">
        <div className="flex items-center gap-2 font-black">
          <Sparkles size={17} className="text-[var(--brand)]" />
          {t.studio.providerReady}
        </div>
        <p className="muted mt-1 text-sm">
          {t.studio.providerDisconnected} · {t.studio.noNewKeys}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full p-5 transition hover:-translate-y-0.5">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                <item.icon size={19} />
              </span>
              <h2 className="mt-4 text-lg font-black">{item.title}</h2>
              <p className="muted mt-2 min-h-12 text-sm leading-6">{item.description}</p>
              <div className="mt-4 text-sm font-black text-[var(--brand)]">
                {t.studio.open} {locale === 'ar' ? '←' : '→'}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Clapperboard size={18} />
          <h2 className="text-lg font-black">{t.studio.recentJobs}</h2>
        </div>
        <div className="mt-3 divide-y divide-[var(--line)]">
          {recent.length ? recent.map((job) => (
            <Link
              key={job.id}
              href="/dashboard/studio/jobs"
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <b className="block truncate">{job.title}</b>
                <span className="muted text-xs">{job.operation}</span>
              </div>
              <span className="muted shrink-0 text-xs">{t.jobs.statuses[job.status]}</span>
            </Link>
          )) : <p className="muted py-5 text-sm">{t.studio.noJobs}</p>}
        </div>
      </Card>
    </>
  );
}

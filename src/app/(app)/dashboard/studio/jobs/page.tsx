import { cookies } from 'next/headers';

import { JobQueueClient } from '@/components/media/job-queue-client';
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

  const jobs = await db.mediaJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { project: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader eyebrow={t.studio.eyebrow} title={t.jobs.title} description={t.jobs.description} />
      <JobQueueClient
        locale={locale}
        jobs={jobs.map((job) => ({
          id: job.id,
          title: job.title,
          kind: job.kind,
          operation: job.operation,
          status: job.status,
          progress: job.progress,
          favorite: job.favorite,
          attempts: job.attempts,
          error: job.error,
          projectName: job.project?.name ?? null,
          createdAt: job.createdAt.toISOString(),
        }))}
      />
    </>
  );
}

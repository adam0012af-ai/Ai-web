import { cookies } from 'next/headers';
import Link from 'next/link';
import { FolderKanban, MessageSquare, Brain, Files } from 'lucide-react';

import { ProjectCreateForm } from '@/components/projects/project-create-form';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getProductMessages(locale).projects;

  const projects = await db.project.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          conversations: true,
          memories: true,
          files: true,
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'مساحة العمل' : 'WORKSPACE'}
        title={t.title}
        description={t.description}
        action={<ProjectCreateForm locale={locale} />}
      />

      {!projects.length ? (
        <Card className="grid min-h-60 place-items-center p-8 text-center">
          <div>
            <FolderKanban className="mx-auto text-[var(--brand)]" size={36} />
            <p className="muted mt-4 text-sm">{t.noProjects}</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="h-full p-5 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                    <FolderKanban size={19} />
                  </span>
                  <span className="muted text-xs">
                    {project.updatedAt.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en')}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-black">{project.name}</h2>
                <p className="muted mt-2 min-h-12 text-sm leading-6">
                  {project.description || '—'}
                </p>

                <div className="muted mt-5 flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><MessageSquare size={13} />{project._count.conversations}</span>
                  <span className="flex items-center gap-1"><Brain size={13} />{project._count.memories}</span>
                  <span className="flex items-center gap-1"><Files size={13} />{project._count.files}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

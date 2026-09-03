import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageSquare, Files, Brain } from 'lucide-react';

import { ProjectMemoryEditor } from '@/components/projects/project-memory-editor';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getProductMessages(locale).projects;

  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    include: {
      memories: {
        where: { enabled: true },
        orderBy: { updatedAt: 'desc' },
      },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 6,
      },
      files: {
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
      _count: {
        select: {
          conversations: true,
          files: true,
          memories: true,
        },
      },
    },
  });

  if (!project) notFound();

  const arrow = locale === 'ar' ? '←' : '→';

  return (
    <>
      <PageHeader
        eyebrow={t.projectOverview}
        title={project.name}
        description={project.description || t.description}
        action={
          <Link
            href={`/dashboard/ai/chat?project=${project.id}`}
            className="brand-gradient rounded-xl px-4 py-2.5 text-sm font-black"
          >
            {t.startChat} {arrow}
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">{t.projectInstructions}</h2>
            <p className="muted mt-3 whitespace-pre-wrap text-sm leading-7">
              {project.instructions || '—'}
            </p>

            <div className="muted mt-5 flex flex-wrap gap-5 text-xs">
              <span className="flex items-center gap-1"><MessageSquare size={14} /> {t.conversations}: {project._count.conversations}</span>
              <span className="flex items-center gap-1"><Brain size={14} /> {t.memory}: {project._count.memories}</span>
              <span className="flex items-center gap-1"><Files size={14} /> {t.files}: {project._count.files}</span>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">{t.conversations}</h2>
            <div className="mt-3 divide-y divide-[var(--line)]">
              {project.conversations.length ? project.conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href="/dashboard/ai/chat"
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <b className="truncate">{conversation.title}</b>
                  <span className="muted shrink-0">
                    {conversation.updatedAt.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en')}
                  </span>
                </Link>
              )) : <p className="muted py-4 text-sm">—</p>}
            </div>
          </Card>
        </div>

        <Card className="p-5 sm:p-6">
          <ProjectMemoryEditor
            projectId={project.id}
            locale={locale}
            memories={project.memories.map((memory) => ({
              id: memory.id,
              label: memory.label,
              content: memory.content,
            }))}
          />
        </Card>
      </div>
    </>
  );
}

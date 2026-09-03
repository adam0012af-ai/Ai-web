import { cookies } from 'next/headers';
import { Suspense } from 'react';

import { ChatWorkspace } from '@/components/ai/chat-workspace';
import { PageHeader } from '@/components/dashboard/page-header';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getDashboardText, normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    conversation?: string;
  }>;
}) {
  const user = (await getCurrentUser())!;
  const params = await searchParams;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getDashboardText(locale);
  const p = getProductMessages(locale);

  const project = params.project
    ? await db.project.findFirst({
        where: {
          id: params.project,
          userId: user.id,
          archived: false,
        },
        select: {
          id: true,
          name: true,
        },
      })
    : null;

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={project ? `${p.chatPro.projectMode}: ${project.name}` : t.chatTitle}
        description={
          project ? p.projects.usingMemory : t.chatDescription
        }
      />

      <Suspense
        fallback={
          <div className="surface min-h-[420px] animate-pulse rounded-2xl" />
        }
      >
        <ChatWorkspace
          locale={locale}
          project={project}
          initialConversationId={params.conversation ?? null}
        />
      </Suspense>
    </>
  );
}

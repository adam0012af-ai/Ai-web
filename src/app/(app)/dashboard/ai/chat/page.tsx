import { cookies } from 'next/headers';
import { Suspense } from 'react';

import { ChatWorkspace } from '@/components/ai/chat-workspace';
import { PageHeader } from '@/components/dashboard/page-header';
import { getDashboardText, normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getDashboardText(locale);

  return (
    <>
      <PageHeader title={t.chatTitle} description={t.chatDescription} />

      <Suspense
        fallback={
          <div className="surface min-h-[420px] animate-pulse rounded-2xl" />
        }
      >
        <ChatWorkspace locale={locale} />
      </Suspense>
    </>
  );
}

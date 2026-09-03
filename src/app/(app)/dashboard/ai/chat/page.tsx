import { Suspense } from 'react';

import { ChatWorkspace } from '@/components/ai/chat-workspace';
import { PageHeader } from '@/components/dashboard/page-header';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <>
      <PageHeader
        title="AI Chat"
        description="Persistent conversations with automatic provider fallback and recent-context management."
      />

      <Suspense
        fallback={
          <div className="surface min-h-[420px] animate-pulse rounded-2xl" />
        }
      >
        <ChatWorkspace />
      </Suspense>
    </>
  );
}

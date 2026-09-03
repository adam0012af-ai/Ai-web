import { cookies } from 'next/headers';

import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { getAdminMessages } from '@/lib/admin-messages';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getAdminMessages(locale).analytics;
  const [users, conversations, tickets, posts] = await Promise.all([
    db.user.count(),
    db.conversation.count(),
    db.supportTicket.count(),
    db.blogPost.count({ where: { published: true } }),
  ]);

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.users} value={users} />
        <StatCard label={t.conversations} value={conversations} />
        <StatCard label={t.tickets} value={tickets} />
        <StatCard label={t.publishedPosts} value={posts} />
      </div>
    </>
  );
}

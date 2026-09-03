import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReplyForm } from '@/components/support/reply-form';
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
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );
  const p = getProductMessages(locale);
  const labels = p.support;

  const ticket = await db.supportTicket.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) notFound();

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={ticket.subject}
        description={labels.conversation}
        action={
          <div className="flex gap-2">
            <Badge>
              {labels.priority[ticket.priority]}
            </Badge>
            <Badge>
              {labels.status[ticket.status]}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6">
          <p className="muted whitespace-pre-wrap leading-7">
            {ticket.description}
          </p>

          <div className="mt-6 space-y-4">
            {ticket.replies.map((reply) => (
              <div
                key={reply.id}
                className={`rounded-2xl p-4 ${
                  reply.authorId === user.id
                    ? 'ms-8 bg-[var(--brand)]/10'
                    : 'me-8 border border-[var(--line)]'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {reply.content}
                </p>
                <span className="muted mt-2 block text-xs">
                  {reply.createdAt.toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en',
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-black">
            {labels.reply}
          </h2>
          <ReplyForm
            ticketId={ticket.id}
            status={ticket.status}
            locale={locale}
          />
        </Card>
      </div>
    </>
  );
}

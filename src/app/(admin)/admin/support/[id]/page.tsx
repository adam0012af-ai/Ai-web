import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { db } from '@/lib/db';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReplyForm } from '@/components/support/reply-form';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      replies: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={ticket.subject}
        description={`${ticket.user.name} · ${ticket.user.email}`}
        action={
          <div className="flex gap-2">
            <Badge>{ticket.priority}</Badge>
            <Badge>{ticket.status}</Badge>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6">
          <p className="muted whitespace-pre-wrap leading-7">
            {ticket.description}
          </p>

          {ticket.replies.map((reply) => (
            <div
              className="mt-4 rounded-2xl border border-[var(--line)] p-4"
              key={reply.id}
            >
              <p className="text-sm">{reply.content}</p>
              <span className="muted mt-2 block text-xs">
                {reply.createdAt.toLocaleString(
                  locale === 'ar' ? 'ar-EG' : 'en',
                )}
              </span>
            </div>
          ))}
        </Card>

        <Card className="p-6">
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

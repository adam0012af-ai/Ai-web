import { cookies } from 'next/headers';
import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketForm } from '@/components/support/ticket-form';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );
  const p = getProductMessages(locale);
  const t = p.support;

  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={t.title}
        description={t.description}
      />

      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-black">
            {t.createTicket}
          </h2>
          <TicketForm locale={locale} />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-black">
            {t.yourTickets}
          </h2>

          <div className="mt-3 divide-y divide-[var(--line)]">
            {tickets.length ? (
              tickets.map((ticket) => (
                <div key={ticket.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      className="text-sm font-bold hover:text-[var(--brand)]"
                      href={`/dashboard/support/${ticket.id}`}
                    >
                      {ticket.subject}
                    </Link>

                    <div className="flex gap-2">
                      <Badge>
                        {t.priority[ticket.priority]}
                      </Badge>
                      <Badge>
                        {t.status[ticket.status]}
                      </Badge>
                    </div>
                  </div>

                  <p className="muted mt-2 line-clamp-2 text-sm">
                    {ticket.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="muted py-6 text-sm">
                {t.noTickets}
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

import { cookies } from 'next/headers';
import Link from 'next/link';

import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminMessages } from '@/lib/admin-messages';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getAdminMessages(locale).support;
  const ar = locale === 'ar';
  const rows = await db.supportTicket.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const statusLabel = (status: string) => {
    if (!ar) return status;
    return (
      {
        OPEN: 'مفتوحة',
        IN_PROGRESS: 'قيد المتابعة',
        RESOLVED: 'تم الحل',
        CLOSED: 'مغلقة',
      } as Record<string, string>
    )[status] ?? status;
  };

  const priorityLabel = (priority: string) => {
    if (!ar) return priority;
    return (
      {
        LOW: 'منخفضة',
        MEDIUM: 'متوسطة',
        HIGH: 'عالية',
        URGENT: 'عاجلة',
      } as Record<string, string>
    )[priority] ?? priority;
  };

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <Card className="divide-y divide-[var(--line)]" dir={ar ? 'rtl' : 'ltr'}>
        {rows.map((ticket) => (
          <div key={ticket.id} className="p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <Link
                  className="font-bold hover:text-[var(--brand)]"
                  href={`/admin/support/${ticket.id}`}
                >
                  {ticket.subject}
                </Link>
                <div className="muted text-xs">
                  {ticket.user.name} · {ticket.user.email}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge>{priorityLabel(ticket.priority)}</Badge>
                <Badge>{statusLabel(ticket.status)}</Badge>
              </div>
            </div>
            <p className="muted mt-2 text-sm">{ticket.description}</p>
          </div>
        ))}
      </Card>
    </>
  );
}

import { cookies } from 'next/headers';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/dashboard/page-header';
import { NotificationList } from '@/components/notifications/notification-list';
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
  const t = p.notifications;

  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={t.title}
        description={t.description}
      />

      <NotificationList
        locale={locale}
        items={items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          readAt: item.readAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}

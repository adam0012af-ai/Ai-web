import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { AppLocale } from '@/lib/i18n';
import { SidebarClient } from './sidebar-client';

export async function Sidebar({
  locale,
}: {
  locale: AppLocale;
}) {
  const user = await getCurrentUser();

  const recent = user
    ? await db.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          projectId: true,
        },
        take: 7,
      })
    : [];

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <SidebarClient
      locale={locale}
      recent={recent}
      isAdmin={isAdmin}
      userName={user?.name ?? 'Nexa User'}
    />
  );
}

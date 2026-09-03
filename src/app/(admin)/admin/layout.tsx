import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { getCurrentUser } from '@/lib/auth/session';
import { normalizeLocale } from '@/lib/i18n';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  if (
    !['ADMIN', 'SUPER_ADMIN'].includes(user.role)
  ) {
    redirect('/dashboard');
  }

  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );

  return (
    <AdminShell
      locale={locale}
      userName={user.name}
      role={user.role}
    >
      {children}
    </AdminShell>
  );
}

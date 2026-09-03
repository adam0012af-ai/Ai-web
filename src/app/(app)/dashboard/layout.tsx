import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { getCurrentUser } from '@/lib/auth/session';
import { normalizeLocale } from '@/lib/i18n';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (!user.onboardingCompletedAt) redirect('/onboarding');

  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const ar = locale === 'ar';

  return (
    <div
      className="flex min-h-screen overflow-x-hidden"
      dir={ar ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <Sidebar locale={locale} />

      <div className="min-w-0 flex-1">
        <Topbar locale={locale} />

        <main className="min-w-0 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </main>
      </div>

      <MobileBottomNav locale={locale} />
    </div>
  );
}

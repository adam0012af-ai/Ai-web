import { cookies } from 'next/headers';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { SettingsForm } from '@/components/account/settings-form';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getProductMessages(locale).settings;

  const settings = await db.userSettings.findUnique({
    where: { userId: user.id },
  }) ?? {
    theme: 'system',
    language: locale,
    responseDetail: 'balanced',
    defaultTone: 'professional',
    codeExplanation: 'balanced',
    emailNotifications: true,
    productUpdates: true,
  };

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'مساحة العمل' : 'WORKSPACE'}
        title={t.title}
        description={t.description}
      />

      <Card className="max-w-4xl p-5 sm:p-6">
        <SettingsForm
          locale={locale}
          settings={{
            theme: settings.theme,
            language: settings.language,
            responseDetail: settings.responseDetail,
            defaultTone: settings.defaultTone,
            codeExplanation: settings.codeExplanation,
            emailNotifications: settings.emailNotifications,
            productUpdates: settings.productUpdates,
          }}
        />
      </Card>
    </>
  );
}

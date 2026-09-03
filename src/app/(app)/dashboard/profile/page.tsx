import { cookies } from 'next/headers';

import { getCurrentUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { ProfileForm } from '@/components/account/profile-form';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );
  const p = getProductMessages(locale);

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={p.profile.title}
        description={p.profile.description}
      />

      <Card className="max-w-2xl p-6">
        <ProfileForm
          name={user.name}
          email={user.email}
          locale={locale}
        />
      </Card>
    </>
  );
}

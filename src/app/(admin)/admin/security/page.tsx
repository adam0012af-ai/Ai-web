import { cookies } from 'next/headers';

import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { getAdminMessages } from '@/lib/admin-messages';
import { normalizeLocale } from '@/lib/i18n';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getAdminMessages(locale).security;

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <Card className="max-w-3xl p-6">
        <p className="muted leading-7">{t.body}</p>
      </Card>
    </>
  );
}

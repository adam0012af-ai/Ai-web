import { cookies } from 'next/headers';

import { CodeStudioClient } from '@/components/code/code-studio-client';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);

  return <CodeStudioClient locale={locale} />;
}

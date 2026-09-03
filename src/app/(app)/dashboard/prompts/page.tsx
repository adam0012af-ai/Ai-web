import { cookies } from 'next/headers';

import { PromptLibraryClient } from '@/components/prompts/prompt-library-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getProductMessages(locale).prompts;

  const prompts = await db.savedPrompt.findMany({
    where: { userId: user.id },
    orderBy: [{ favorite: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
  });

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'مساحة العمل' : 'WORKSPACE'}
        title={t.title}
        description={t.description}
      />

      <PromptLibraryClient
        locale={locale}
        prompts={prompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          content: prompt.content,
          category: prompt.category,
          language: prompt.language,
          favorite: prompt.favorite,
        }))}
      />
    </>
  );
}

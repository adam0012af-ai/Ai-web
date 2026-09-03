import { cookies } from 'next/headers';
import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { FavoriteToolButton } from '@/components/ai/favorite-tool-button';
import { RecentTools } from '@/components/ai/recent-tools';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import {
  aiTools,
  localizeTool,
} from '@/data/ai-tools';
import { normalizeLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();

  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );

  const ar = locale === 'ar';

  const favorites =
    await db.favorite.findMany({
      where: {
        userId: user.id,
        type: 'AI_TOOL',
      },
      select: {
        referenceId: true,
      },
    });

  const favoriteSet = new Set(
    favorites.map(
      (favorite) => favorite.referenceId,
    ),
  );

  return (
    <>
      <PageHeader
        eyebrow={
          ar ? 'مساحة العمل' : 'WORKSPACE'
        }
        title={
          ar
            ? 'أدوات الذكاء الاصطناعي'
            : 'AI Workspace'
        }
        description={
          ar
            ? '25 أداة متخصصة تعمل جميعها من خلال نفس طبقة الذكاء الاصطناعي المرنة والموثوقة.'
            : '25 focused tools routed through the same resilient AI layer.'
        }
      />

      <RecentTools locale={locale} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {aiTools.map((tool) => {
          const localized =
            localizeTool(tool, locale);

          return (
            <Card
              key={tool.slug}
              className="group p-5"
            >
              <div className="flex justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                  <tool.icon size={19} />
                </span>

                <FavoriteToolButton
                  slug={tool.slug}
                  title={
                    localized.displayTitle
                  }
                  initial={favoriteSet.has(
                    tool.slug,
                  )}
                />
              </div>

              <div className="muted mt-5 text-xs">
                {localized.displayCategory}
              </div>

              <h2 className="mt-1 text-lg font-black">
                {localized.displayTitle}
              </h2>

              <p className="muted mt-2 min-h-12 text-sm leading-6">
                {
                  localized.displayDescription
                }
              </p>

              <div className="muted mt-4 flex justify-between gap-3 text-xs">
                <span>
                  {ar
                    ? 'يتم تتبع الاستخدام الأخير'
                    : 'Recent usage tracked'}
                </span>

                <Link
                  className="shrink-0 font-black text-[var(--brand)]"
                  href={
                    tool.slug === 'chat'
                      ? '/dashboard/ai/chat'
                      : `/dashboard/ai/${tool.slug}`
                  }
                >
                  {ar
                    ? 'تشغيل ←'
                    : 'Launch →'}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

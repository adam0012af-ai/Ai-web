import { cookies } from 'next/headers';
import { AudioLines, Film, Image as ImageIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normalizeLocale } from '@/lib/i18n';
import { getMediaMessages } from '@/lib/media-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const t = getMediaMessages(locale);

  const assets = await db.mediaAsset.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { project: { select: { name: true } } },
  });

  const icons: Record<'IMAGE' | 'VIDEO' | 'AUDIO', typeof ImageIcon> = {
    IMAGE: ImageIcon,
    VIDEO: Film,
    AUDIO: AudioLines,
  };

  return (
    <>
      <PageHeader eyebrow={t.studio.eyebrow} title={t.library.title} description={t.library.description} />

      {!assets.length ? (
        <Card className="p-8 text-center">
          <ImageIcon className="mx-auto text-[var(--brand)]" size={34} />
          <p className="muted mt-4 text-sm">{t.library.empty}</p>
          <p className="muted mt-2 text-xs">{t.library.storageNote}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const AssetIcon = icons[asset.kind];

            return (
              <Card key={asset.id} className="p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                  <AssetIcon size={19} />
                </span>
                <h2 className="mt-4 truncate font-black">{asset.name}</h2>
                <div className="muted mt-2 space-y-1 text-xs">
                  <div>{asset.kind}</div>
                  {asset.width && asset.height ? <div>{asset.width} × {asset.height}</div> : null}
                  {asset.project?.name ? <div>{asset.project.name}</div> : null}
                  <div>{asset.createdAt.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en')}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

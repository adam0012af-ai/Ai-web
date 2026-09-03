import { cookies } from 'next/headers';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = (await getCurrentUser())!;
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );
  const p = getProductMessages(locale);
  const t = p.files;

  const files = await db.uploadedFile.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={t.title}
        description={t.description}
      />

      <Card className="p-6">
        {files.length ? (
          files.map((file) => (
            <div
              key={file.id}
              className="border-b border-[var(--line)] py-3"
            >
              <b>{file.name}</b>
              <span className="muted ms-3 text-xs">
                {t.type}: {file.mimeType} · {t.size}:{' '}
                {(file.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          ))
        ) : (
          <div className="text-center">
            <div className="muted text-sm">
              {t.noFiles}
            </div>
            <div className="muted mt-2 text-xs">
              {t.storagePending}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

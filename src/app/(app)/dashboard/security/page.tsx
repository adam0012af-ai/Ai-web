import { cookies } from 'next/headers';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { PasswordForm } from '@/components/account/password-form';
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
  const t = p.security;

  const sessions = await db.session.findMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader
        eyebrow={p.common.workspace}
        title={t.title}
        description={t.description}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-black">
            {t.changePassword}
          </h2>
          <PasswordForm locale={locale} />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-black">
            {t.activeSessions}
          </h2>

          <div className="mt-3 divide-y divide-[var(--line)]">
            {sessions.length ? (
              sessions.map((session) => (
                <div
                  className="py-3 text-sm"
                  key={session.id}
                >
                  <b>
                    {session.userAgent?.slice(0, 70) ??
                      t.unknownBrowser}
                  </b>
                  <div className="muted mt-1 text-xs">
                    {session.ipAddress || t.unknownIp} ·{' '}
                    {t.expires}{' '}
                    {session.expiresAt.toLocaleString(
                      locale === 'ar' ? 'ar-EG' : 'en',
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="muted py-4 text-sm">
                {t.noSessions}
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

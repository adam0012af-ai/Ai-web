'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

type N = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

async function csrf() {
  const response = await fetch('/api/csrf', {
    cache: 'no-store',
  });
  const body = await response.json();
  return body.token as string;
}

export function NotificationList({
  items,
  locale,
}: {
  items: N[];
  locale: AppLocale;
}) {
  const router = useRouter();
  const t = getProductMessages(locale).notifications;

  function localizeNotification(item: N) {
    if (locale !== 'ar') return item;

    if (item.title === 'Welcome to Nexa AI') {
      return {
        ...item,
        title: t.welcomeTitle,
        body: t.welcomeBody,
      };
    }

    if (item.title === 'Free plan active') {
      return {
        ...item,
        title: t.freePlanTitle,
        body: t.freePlanBody,
      };
    }

    return item;
  }

  async function action(action: string, id?: string) {
    const token = await csrf();

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
      },
      body: JSON.stringify({ action, id }),
    });

    router.refresh();
  }

  return (
    <div className="surface divide-y divide-[var(--line)] overflow-hidden rounded-2xl">
      {items.length ? (
        items.map((raw) => {
          const item = localizeNotification(raw);

          return (
            <div
              className={`flex gap-4 p-5 ${
                item.readAt ? 'opacity-65' : ''
              }`}
              key={item.id}
            >
              <span
                className={`mt-1 size-2 shrink-0 rounded-full ${
                  item.readAt
                    ? 'bg-gray-400'
                    : 'bg-[var(--brand)]'
                }`}
              />

              <div className="min-w-0 flex-1">
                <b>{item.title}</b>
                <p className="muted mt-1 text-sm">
                  {item.body}
                </p>
                <p className="muted mt-2 text-xs">
                  {new Date(item.createdAt).toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en',
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                {!item.readAt ? (
                  <Button
                    variant="ghost"
                    onClick={() => action('read', item.id)}
                  >
                    {t.markRead}
                  </Button>
                ) : null}

                <Button
                  variant="ghost"
                  onClick={() => action('delete', item.id)}
                >
                  {t.delete}
                </Button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="muted p-8 text-center">
          {t.none}
        </div>
      )}

      <div className="flex justify-end gap-2 p-3">
        <Button
          variant="ghost"
          onClick={() => action('all-read')}
          disabled={!items.length}
        >
          {t.markAllRead}
        </Button>
      </div>
    </div>
  );
}

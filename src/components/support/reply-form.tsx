'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

async function csrf() {
  const response = await fetch('/api/csrf', {
    cache: 'no-store',
  });
  const body = await response.json();
  return body.token as string;
}

export function ReplyForm({
  ticketId,
  status,
  locale,
}: {
  ticketId: string;
  status: string;
  locale: AppLocale;
}) {
  const router = useRouter();
  const t = getProductMessages(locale).support;
  const [busy, setBusy] = useState(false);

  async function reply(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      const token = await csrf();

      const response = await fetch(
        `/api/support/tickets/${ticketId}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-csrf-token': token,
          },
          body: JSON.stringify({
            content: form.get('content'),
          }),
        },
      );

      if (response.ok) {
        event.currentTarget.reset();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (!confirm(t.closeConfirm)) return;

    const token = await csrf();

    await fetch(`/api/support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
      },
      body: JSON.stringify({
        status: 'CLOSED',
      }),
    });

    router.refresh();
  }

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <form
        onSubmit={reply}
        className="space-y-3"
      >
        <Textarea
          name="content"
          placeholder={t.writeReply}
          required
          minLength={2}
        />

        <Button
          disabled={
            busy || status === 'CLOSED'
          }
        >
          {busy ? t.sending : t.sendReply}
        </Button>
      </form>

      {status !== 'CLOSED' ? (
        <Button
          variant="ghost"
          className="mt-3"
          onClick={close}
        >
          {t.closeTicket}
        </Button>
      ) : null}
    </div>
  );
}

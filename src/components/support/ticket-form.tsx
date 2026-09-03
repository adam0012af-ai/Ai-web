'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export function TicketForm({
  locale,
}: {
  locale: AppLocale;
}) {
  const router = useRouter();
  const t = getProductMessages(locale).support;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const form = new FormData(event.currentTarget);
      const csrfResponse = await fetch('/api/csrf', {
        cache: 'no-store',
      });
      const csrf = await csrfResponse.json();

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrf.token,
        },
        body: JSON.stringify(
          Object.fromEntries(form.entries()),
        ),
      });

      if (!response.ok) {
        setMessage(t.failed);
        return;
      }

      setMessage(t.created);
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <Input
        name="subject"
        placeholder={t.subjectPlaceholder}
        required
      />

      <select
        name="priority"
        className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
      >
        <option value="LOW">{t.priority.LOW}</option>
        <option value="MEDIUM">
          {t.priority.MEDIUM}
        </option>
        <option value="HIGH">{t.priority.HIGH}</option>
        <option value="URGENT">
          {t.priority.URGENT}
        </option>
      </select>

      <Textarea
        name="description"
        placeholder={t.issuePlaceholder}
        required
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy}>
          {busy ? t.creating : t.createTicket}
        </Button>

        {message ? (
          <span className="muted text-sm">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

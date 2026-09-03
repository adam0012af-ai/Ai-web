'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

async function csrf() {
  const response = await fetch('/api/csrf', {
    cache: 'no-store',
  });
  const body = await response.json();
  return body.token as string;
}

export function ProfileForm({
  name,
  email,
  locale,
}: {
  name: string;
  email: string;
  locale: AppLocale;
}) {
  const router = useRouter();
  const t = getProductMessages(locale).profile;
  const [value, setValue] = useState(name);
  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ type: 'loading' });

    try {
      const token = await csrf();

      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ name: value }),
      });

      if (!response.ok) {
        throw new Error(t.failed);
      }

      setStatus({
        type: 'success',
        message: t.updated,
      });

      router.refresh();
    } catch {
      setStatus({
        type: 'error',
        message: t.failed,
      });
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={submit}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <label className="block text-sm font-semibold">
        {t.fullName}
        <Input
          className="mt-2"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
        />
      </label>

      <label className="block text-sm font-semibold">
        {t.email}
        <Input
          className="mt-2"
          value={email}
          disabled
          aria-describedby="email-note"
        />
      </label>

      <p
        id="email-note"
        className="muted -mt-2 text-xs"
      >
        {t.emailNote}
      </p>

      {status.message ? (
        <div
          role="status"
          className={`rounded-xl p-3 text-sm ${
            status.type === 'error'
              ? 'bg-red-500/10 text-red-600'
              : 'bg-emerald-500/10 text-emerald-600'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <Button disabled={status.type === 'loading'}>
        {status.type === 'loading' ? t.saving : t.save}
      </Button>
    </form>
  );
}

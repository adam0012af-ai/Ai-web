'use client';

import { useState } from 'react';

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

export function PasswordForm({
  locale,
}: {
  locale: AppLocale;
}) {
  const t = getProductMessages(locale).security;

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [status, setStatus] = useState<{
    loading: boolean;
    message?: string;
    error?: boolean;
  }>({ loading: false });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ loading: true });

    try {
      const token = await csrf();

      const response = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(t.failed);
      }

      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setStatus({
        loading: false,
        message: t.changed,
      });
    } catch {
      setStatus({
        loading: false,
        error: true,
        message: t.failed,
      });
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <label className="block text-sm font-semibold">
        {t.currentPassword}
        <Input
          className="mt-2"
          type="password"
          autoComplete="current-password"
          required
          value={form.currentPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              currentPassword: event.target.value,
            }))
          }
        />
      </label>

      <label className="block text-sm font-semibold">
        {t.newPassword}
        <Input
          className="mt-2"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          value={form.newPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              newPassword: event.target.value,
            }))
          }
        />
        <span className="muted mt-1 block text-xs">
          {t.passwordHint}
        </span>
      </label>

      <label className="block text-sm font-semibold">
        {t.confirmPassword}
        <Input
          className="mt-2"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
        />
      </label>

      {status.message ? (
        <div
          role="status"
          className={`rounded-xl p-3 text-sm ${
            status.error
              ? 'bg-red-500/10 text-red-600'
              : 'bg-emerald-500/10 text-emerald-600'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <Button disabled={status.loading}>
        {status.loading ? t.updating : t.change}
      </Button>
    </form>
  );
}

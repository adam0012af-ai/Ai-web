'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

type Settings = {
  theme: string;
  language: string;
  responseDetail: string;
  defaultTone: string;
  codeExplanation: string;
  emailNotifications: boolean;
  productUpdates: boolean;
};

async function csrf() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok || !body?.token) throw new Error('CSRF');
  return body.token as string;
}

export function SettingsForm({
  settings,
  locale,
}: {
  settings: Settings;
  locale: AppLocale;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const t = getProductMessages(locale).settings;
  const common = getProductMessages(locale).common;

  const [form, setForm] = useState({
    theme: (['system', 'light', 'dark'].includes(settings.theme)
      ? settings.theme
      : 'system') as 'system' | 'light' | 'dark',
    language: (settings.language === 'en' ? 'en' : 'ar') as 'en' | 'ar',
    responseDetail: (['concise', 'balanced', 'detailed'].includes(settings.responseDetail)
      ? settings.responseDetail
      : 'balanced') as 'concise' | 'balanced' | 'detailed',
    defaultTone: (['professional', 'friendly', 'direct', 'creative'].includes(settings.defaultTone)
      ? settings.defaultTone
      : 'professional') as 'professional' | 'friendly' | 'direct' | 'creative',
    codeExplanation: (['minimal', 'balanced', 'detailed'].includes(settings.codeExplanation)
      ? settings.codeExplanation
      : 'balanced') as 'minimal' | 'balanced' | 'detailed',
    emailNotifications: settings.emailNotifications,
    productUpdates: settings.productUpdates,
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
      const response = await fetch('/api/account/settings', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify(form),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? common.error);
      }

      setTheme(form.theme);

      document.cookie = `nexa_locale=${form.language}; Path=/; Max-Age=31536000; SameSite=Lax`;

      setStatus({
        loading: false,
        message: t.saved,
      });

      router.refresh();
    } catch (error) {
      setStatus({
        loading: false,
        error: true,
        message: error instanceof Error ? error.message : common.error,
      });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <section>
        <h2 className="font-black">{t.appearance}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            {t.theme}
            <select
              className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 outline-none"
              value={form.theme}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  theme: event.target.value as typeof form.theme,
                }))
              }
            >
              <option value="system">{t.system}</option>
              <option value="light">{t.light}</option>
              <option value="dark">{t.dark}</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            {t.language}
            <select
              className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 outline-none"
              value={form.language}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  language: event.target.value as typeof form.language,
                }))
              }
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
            <span className="muted mt-1 block text-xs">{t.languageHint}</span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-black">{t.aiPreferences}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            {t.responseDetail}
            <select
              value={form.responseDetail}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  responseDetail: event.target.value as typeof form.responseDetail,
                }))
              }
              className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
            >
              <option value="concise">{t.concise}</option>
              <option value="balanced">{t.balanced}</option>
              <option value="detailed">{t.detailed}</option>
            </select>
          </label>

          <label className="text-sm font-semibold">
            {t.defaultTone}
            <select
              value={form.defaultTone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultTone: event.target.value as typeof form.defaultTone,
                }))
              }
              className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
            >
              <option value="professional">{t.professional}</option>
              <option value="friendly">{t.friendly}</option>
              <option value="direct">{t.direct}</option>
              <option value="creative">{t.creative}</option>
            </select>
          </label>

          <label className="text-sm font-semibold">
            {t.codeExplanation}
            <select
              value={form.codeExplanation}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  codeExplanation: event.target.value as typeof form.codeExplanation,
                }))
              }
              className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
            >
              <option value="minimal">{t.codeShort}</option>
              <option value="balanced">{t.codeBalanced}</option>
              <option value="detailed">{t.codeDetailed}</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-black">{t.notifications}</h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] p-4">
            <input
              className="mt-1"
              type="checkbox"
              checked={form.emailNotifications}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  emailNotifications: event.target.checked,
                }))
              }
            />
            <span>
              <b className="block text-sm">{t.emailNotifications}</b>
              <span className="muted text-xs">{t.emailNotificationsHint}</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] p-4">
            <input
              className="mt-1"
              type="checkbox"
              checked={form.productUpdates}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  productUpdates: event.target.checked,
                }))
              }
            />
            <span>
              <b className="block text-sm">{t.productUpdates}</b>
              <span className="muted text-xs">{t.productUpdatesHint}</span>
            </span>
          </label>
        </div>
      </section>

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
        {status.loading ? common.saving : t.save}
      </Button>
    </form>
  );
}

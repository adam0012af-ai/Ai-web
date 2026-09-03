'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

async function csrf() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data?.token) throw new Error('CSRF');
  return data.token as string;
}

export function ProjectCreateForm({ locale }: { locale: AppLocale }) {
  const t = getProductMessages(locale).projects;
  const common = getProductMessages(locale).common;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();

    if (!name) {
      setError(common.required);
      return;
    }

    setBusy(true);
    setError('');

    try {
      const token = await csrf();
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          name,
          description: String(data.get('description') ?? ''),
          instructions: String(data.get('instructions') ?? ''),
          language: String(data.get('language') ?? 'auto'),
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? common.error);
      }

      setOpen(false);
      router.push(`/dashboard/projects/${body.project.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : common.error);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <FolderPlus size={16} />
        {t.newProject}
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="surface mb-6 grid gap-4 rounded-2xl p-5 sm:grid-cols-2"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <label className="text-sm font-bold">
        {t.projectName}
        <input
          name="name"
          maxLength={80}
          autoFocus
          className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none"
        />
      </label>

      <label className="text-sm font-bold">
        {t.language}
        <select
          name="language"
          defaultValue="auto"
          className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 outline-none"
        >
          <option value="auto">{t.autoLanguage}</option>
          <option value="ar">{t.arabic}</option>
          <option value="en">{t.english}</option>
        </select>
      </label>

      <label className="text-sm font-bold sm:col-span-2">
        {t.projectDescription}
        <textarea
          name="description"
          maxLength={500}
          rows={3}
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent p-3 outline-none"
        />
      </label>

      <label className="text-sm font-bold sm:col-span-2">
        {t.projectInstructions}
        <textarea
          name="instructions"
          maxLength={4000}
          rows={4}
          placeholder={t.instructionsHint}
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent p-3 outline-none"
        />
      </label>

      {error ? (
        <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 sm:col-span-2">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 sm:col-span-2">
        <Button disabled={busy}>
          {busy ? common.saving : t.createProject}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {common.cancel}
        </Button>
      </div>
    </form>
  );
}

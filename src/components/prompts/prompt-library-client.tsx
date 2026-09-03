'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

type PromptItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  language: string;
  favorite: boolean;
};

async function csrf() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok || !body?.token) throw new Error('CSRF');
  return body.token as string;
}

export function PromptLibraryClient({
  locale,
  prompts,
}: {
  locale: AppLocale;
  prompts: PromptItem[];
}) {
  const t = getProductMessages(locale).prompts;
  const common = getProductMessages(locale).common;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      const token = await csrf();

      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          title: String(form.get('title') ?? ''),
          content: String(form.get('content') ?? ''),
          category: String(form.get('category') ?? 'general'),
          language: String(form.get('language') ?? 'auto'),
          favorite: false,
        }),
      });

      if (!response.ok) throw new Error(common.error);

      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const token = await csrf();
    const response = await fetch(`/api/prompts/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': token },
    });

    if (response.ok) router.refresh();
  }

  async function copy(item: PromptItem) {
    await navigator.clipboard.writeText(item.content);
    setCopied(item.id);
    setTimeout(() => setCopied(''), 1300);
  }

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-5">
        <Button onClick={() => setOpen((value) => !value)}>
          <Plus size={16} />
          {t.newPrompt}
        </Button>
      </div>

      {open ? (
        <form onSubmit={create} className="surface mb-6 grid gap-4 rounded-2xl p-5">
          <input
            name="title"
            required
            maxLength={100}
            placeholder={t.promptTitle}
            className="h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none"
          />
          <textarea
            name="content"
            required
            maxLength={12000}
            rows={6}
            placeholder={t.content}
            className="rounded-xl border border-[var(--line)] bg-transparent p-3 outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="category"
              defaultValue="general"
              placeholder={t.category}
              className="h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none"
            />
            <select
              name="language"
              defaultValue="auto"
              className="h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 outline-none"
            >
              <option value="auto">Auto</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button disabled={busy}>{busy ? common.saving : t.savePrompt}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {common.cancel}
            </Button>
          </div>
        </form>
      ) : null}

      {!prompts.length ? (
        <div className="surface rounded-2xl p-8 text-center">
          <p className="muted text-sm">{t.noPrompts}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="surface rounded-2xl p-5">
              <div className="muted text-xs">{prompt.category}</div>
              <h2 className="mt-1 font-black">{prompt.title}</h2>
              <p className="muted mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6">
                {prompt.content}
              </p>

              <div className="mt-4 flex gap-1">
                <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => void copy(prompt)}>
                  {copied === prompt.id ? <Check size={14} /> : <Copy size={14} />}
                  {t.copy}
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs text-red-500"
                  onClick={() => void remove(prompt.id)}
                >
                  <Trash2 size={14} />
                  {common.delete}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

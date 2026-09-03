'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

type MemoryItem = {
  id: string;
  label: string;
  content: string;
};

async function csrf() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok || !body?.token) throw new Error('CSRF');
  return body.token as string;
}

export function ProjectMemoryEditor({
  projectId,
  locale,
  memories,
}: {
  projectId: string;
  locale: AppLocale;
  memories: MemoryItem[];
}) {
  const t = getProductMessages(locale).projects;
  const common = getProductMessages(locale).common;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    const label = String(form.get('label') ?? '').trim();
    const content = String(form.get('content') ?? '').trim();

    if (!label || !content) {
      setError(common.required);
      return;
    }

    setBusy(true);
    setError('');

    try {
      const token = await csrf();
      const response = await fetch(`/api/projects/${projectId}/memory`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ label, content }),
      });

      if (!response.ok) throw new Error(common.error);

      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError(common.error);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const token = await csrf();
    const response = await fetch(`/api/projects/${projectId}/memory/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': token },
    });

    if (response.ok) router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-[var(--brand)]" />
        <h2 className="text-lg font-black">{t.memory}</h2>
      </div>
      <p className="muted mt-1 text-sm">{t.memoryDescription}</p>

      <form onSubmit={add} className="mt-4 grid gap-3">
        <input
          name="label"
          maxLength={80}
          placeholder={t.memoryLabel}
          className="h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none"
        />
        <textarea
          name="content"
          maxLength={2000}
          rows={3}
          placeholder={t.memoryContent}
          className="rounded-xl border border-[var(--line)] bg-transparent p-3 outline-none"
        />
        <Button disabled={busy} className="w-fit">
          {busy ? common.saving : t.addMemory}
        </Button>
      </form>

      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

      <div className="mt-5 space-y-2">
        {memories.length ? memories.map((memory) => (
          <div key={memory.id} className="rounded-xl border border-[var(--line)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black">{memory.label}</div>
                <p className="muted mt-1 whitespace-pre-wrap text-sm leading-6">{memory.content}</p>
              </div>
              <button
                onClick={() => void remove(memory.id)}
                className="muted grid size-8 shrink-0 place-items-center rounded-lg hover:bg-red-500/10 hover:text-red-500"
                aria-label={common.delete}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )) : <p className="muted text-sm">{t.noMemory}</p>}
      </div>
    </div>
  );
}

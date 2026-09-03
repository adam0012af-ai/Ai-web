'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUp,
  Code2,
  FileSearch,
  FolderKanban,
  Images,
  Mic,
  Video,
} from 'lucide-react';

import type { AppLocale } from '@/lib/i18n';
import { getV6Messages } from '@/lib/v6-messages';

export function SmartStart({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const t = getV6Messages(locale).home;
  const ar = locale === 'ar';
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const actions = [
    { href: '/dashboard/studio/image', label: t.image, hint: t.imageHint, icon: Images },
    { href: '/dashboard/studio/video', label: t.video, hint: t.videoHint, icon: Video },
    { href: '/dashboard/ai/code', label: t.code, hint: t.codeHint, icon: Code2 },
    { href: '/dashboard/ai/document', label: t.document, hint: t.documentHint, icon: FileSearch },
    { href: '/dashboard/projects', label: t.project, hint: t.projectHint, icon: FolderKanban },
    { href: '/dashboard/ai/chat', label: t.voice, hint: t.voiceHint, icon: Mic },
  ];

  async function start(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    setBusy(true);
    setError('');

    try {
      const csrfResponse = await fetch('/api/csrf', { cache: 'no-store' });
      const csrfBody = await csrfResponse.json();

      if (!csrfResponse.ok || !csrfBody?.token) throw new Error('csrf');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfBody.token,
        },
        body: JSON.stringify({
          conversationId: null,
          projectId: null,
          message,
        }),
      });

      if (!response.ok) throw new Error('chat');

      const conversationId = response.headers.get('x-conversation-id');
      if (!conversationId) throw new Error('conversation');

      router.push(
        `/dashboard/ai/chat?conversation=${encodeURIComponent(conversationId)}`,
      );
      router.refresh();
    } catch {
      setError(t.startError);
      setBusy(false);
    }
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'}>
      <form onSubmit={start} className="mx-auto max-w-3xl">
        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-2 shadow-[0_18px_55px_rgba(0,0,0,.08)]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={3}
            maxLength={12000}
            placeholder={t.placeholder}
            disabled={busy}
            className="min-h-28 w-full resize-none bg-transparent px-4 py-3 text-start text-base leading-7 outline-none placeholder:text-[var(--muted)]"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="muted text-xs">{busy ? t.starting : 'Nexa AI'}</span>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="brand-gradient grid size-10 shrink-0 place-items-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t.send}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-center text-sm text-red-500">{error}</p>
        ) : null}
      </form>

      <div className="mx-auto mt-6 grid max-w-4xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex min-h-24 items-start gap-3 rounded-2xl border border-transparent p-4 transition hover:border-[var(--line)] hover:bg-[var(--card)]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
              <action.icon size={18} />
            </span>
            <span className="min-w-0">
              <b className="block text-sm">{action.label}</b>
              <span className="muted mt-1 block text-xs leading-5">
                {action.hint}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

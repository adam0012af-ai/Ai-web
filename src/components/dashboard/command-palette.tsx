'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { aiTools } from '@/data/ai-tools';
import type { AppLocale } from '@/lib/i18n';
import { getDashboardText } from '@/lib/i18n';
import { dashboardNav } from './nav-items';

type Item = {
  label: string;
  href: string;
  type?: string;
};

export function CommandPalette({ locale }: { locale: AppLocale }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState<Item[]>([]);
  const router = useRouter();
  const ar = locale === 'ar';
  const t = getDashboardText(locale);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    addEventListener('keydown', listener);
    return () => removeEventListener('keydown', listener);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRemote([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
          .then((response) => (response.ok ? response.json() : { results: [] }))
          .then((data) => setRemote(data.results ?? []))
          .catch(() => undefined),
      180,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const local = useMemo(
    () =>
      [
        ...dashboardNav.map(([label, href, , labelAr]) => ({
          label: ar ? labelAr : label,
          href,
          type: t.page,
        })),
        ...aiTools.map((tool) => ({
          label: tool.title,
          href:
            tool.slug === 'chat'
              ? '/dashboard/ai/chat'
              : `/dashboard/ai/${tool.slug}`,
          type: t.aiTool,
        })),
      ]
        .filter((item) => item.label.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 7),
    [q, ar, t.page, t.aiTool],
  );

  const items = [
    ...remote,
    ...local.filter((localItem) => !remote.some((item) => item.href === localItem.href)),
  ].slice(0, 12);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={t.searchWorkspace}
        className="muted flex items-center gap-2 rounded-xl border border-[var(--line)] p-2 text-start text-sm md:min-w-64 md:px-3"
      >
        <Search size={15} />
        <span className="hidden md:inline">{t.searchWorkspace}</span>
        <kbd className="ms-auto hidden text-xs md:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-start bg-black/50 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
      dir={ar ? 'rtl' : 'ltr'}
    >
      <div
        className="surface mx-auto w-full max-w-xl rounded-2xl p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-transparent p-4 text-start outline-none"
        />

        {items.map((item, index) => (
          <button
            key={`${item.href}-${index}`}
            onClick={() => {
              router.push(item.href);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-start text-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"
          >
            <span>{item.label}</span>
            <span className="muted text-xs">{item.type}</span>
          </button>
        ))}

        {q.length > 1 && !items.length ? (
          <div className="muted p-5 text-sm">{t.noResults}</div>
        ) : null}
      </div>
    </div>
  );
}

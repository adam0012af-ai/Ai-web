'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Code2,
  FileSearch,
  FolderKanban,
  Images,
  MessageSquarePlus,
  Search,
  Video,
} from 'lucide-react';

import { aiTools, localizeTool } from '@/data/ai-tools';
import type { AppLocale } from '@/lib/i18n';
import { getDashboardText } from '@/lib/i18n';
import { accountNav, dashboardNav } from './nav-items';

type Item = {
  label: string;
  href: string;
  type?: string;
  icon?: typeof Search;
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

      if (event.key === 'Escape') setOpen(false);
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
        fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
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

  const local = useMemo(() => {
    const nav = [...dashboardNav, ...accountNav].map(([label, href, Icon, labelAr]) => ({
      label: ar ? labelAr : label,
      href,
      type: t.page,
      icon: Icon,
    }));

    const actions: Item[] = [
      {
        label: ar ? 'محادثة جديدة' : 'New chat',
        href: '/dashboard/ai/chat',
        type: ar ? 'إجراء' : 'Action',
        icon: MessageSquarePlus,
      },
      {
        label: ar ? 'مشروع جديد' : 'New project',
        href: '/dashboard/projects',
        type: ar ? 'إجراء' : 'Action',
        icon: FolderKanban,
      },
      {
        label: ar ? 'إنشاء صورة' : 'Create image',
        href: '/dashboard/studio/image',
        type: ar ? 'إجراء' : 'Action',
        icon: Images,
      },
      {
        label: ar ? 'إنشاء فيديو' : 'Create video',
        href: '/dashboard/studio/video',
        type: ar ? 'إجراء' : 'Action',
        icon: Video,
      },
      {
        label: ar ? 'استوديو البرمجة' : 'Code Studio',
        href: '/dashboard/code',
        type: ar ? 'إجراء' : 'Action',
        icon: Code2,
      },
      {
        label: ar ? 'تحليل مستند' : 'Analyze document',
        href: '/dashboard/ai/document',
        type: ar ? 'إجراء' : 'Action',
        icon: FileSearch,
      },
    ];

    const tools = aiTools.map((tool) => {
      const localized = localizeTool(tool, locale);
      const href =
        tool.slug === 'chat'
          ? '/dashboard/ai/chat'
          : tool.slug === 'code'
            ? '/dashboard/code'
            : `/dashboard/ai/${tool.slug}`;

      return {
        label: localized.displayTitle,
        href,
        type: t.aiTool,
        icon: tool.icon,
      };
    });

    const needle = q.toLowerCase().trim();
    const all = [...actions, ...nav, ...tools];

    return all
      .filter((item) => (needle ? item.label.toLowerCase().includes(needle) : true))
      .slice(0, 9);
  }, [q, ar, locale, t.page, t.aiTool]);

  const items = [
    ...remote,
    ...local.filter(
      (localItem) => !remote.some((item) => item.href === localItem.href),
    ),
  ].slice(0, 14);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={t.searchWorkspace}
        className="muted flex items-center gap-2 rounded-xl border border-[var(--line)] p-2 text-start text-sm md:min-w-56 md:px-3"
      >
        <Search size={15} />
        <span className="hidden md:inline">{t.searchWorkspace}</span>
        <kbd className="ms-auto hidden text-xs md:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-start bg-black/55 p-3 pt-[9vh] sm:p-4 sm:pt-[12vh]"
      onClick={() => setOpen(false)}
      dir={ar ? 'rtl' : 'ltr'}
    >
      <div
        className="surface mx-auto w-full max-w-2xl overflow-hidden rounded-2xl p-2 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-3">
          <Search size={18} className="muted" />
          <input
            autoFocus
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent py-4 text-start outline-none"
          />
          <kbd className="muted text-xs">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-1">
          {items.map((item, index) => {
            const Icon = item.icon;

            return (
              <button
                key={`${item.href}-${index}`}
                onClick={() => {
                  router.push(item.href);
                  setOpen(false);
                  setQ('');
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"
              >
                {Icon ? (
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/[.04] dark:bg-white/[.05]">
                    <Icon size={15} />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="muted shrink-0 text-xs">{item.type}</span>
              </button>
            );
          })}

          {q.length > 1 && !items.length ? (
            <div className="muted p-5 text-sm">{t.noResults}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

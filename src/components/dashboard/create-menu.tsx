'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookMarked,
  Code2,
  FileSearch,
  FolderKanban,
  Images,
  MessageSquare,
  Mic,
  Plus,
  Video,
} from 'lucide-react';

import type { AppLocale } from '@/lib/i18n';
import { getV6Messages } from '@/lib/v6-messages';

export function CreateMenu({ locale }: { locale: AppLocale }) {
  const [open, setOpen] = useState(false);
  const t = getV6Messages(locale).create;
  const ar = locale === 'ar';

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const items = [
    { href: '/dashboard/ai/chat', label: t.chat, icon: MessageSquare },
    { href: '/dashboard/projects', label: t.project, icon: FolderKanban },
    { href: '/dashboard/studio/image', label: t.image, icon: Images },
    { href: '/dashboard/studio/video', label: t.video, icon: Video },
    { href: '/dashboard/code', label: t.code, icon: Code2 },
    { href: '/dashboard/ai/document', label: t.document, icon: FileSearch },
    { href: '/dashboard/prompts', label: t.prompt, icon: BookMarked },
    { href: '/dashboard/ai/chat', label: t.voice, icon: Mic },
  ];

  return (
    <div className="relative" dir={ar ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="brand-gradient flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-black text-white shadow-sm transition hover:opacity-95"
        aria-expanded={open}
      >
        <Plus size={16} />
        <span className="hidden sm:inline">{t.button}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            className={`surface absolute top-12 z-50 w-72 rounded-2xl p-2 shadow-2xl ${ar ? 'left-0' : 'right-0'}`}
          >
            <div className="muted px-3 pb-2 pt-1 text-xs font-black">{t.title}</div>
            <div className="grid grid-cols-2 gap-1">
              {items.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-20 flex-col justify-between rounded-xl p-3 text-start text-sm font-bold transition hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                >
                  <item.icon size={18} className="text-[var(--brand)]" />
                  <span className="mt-3">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';

import {
  aiTools,
  localizeTool,
} from '@/data/ai-tools';
import type { AppLocale } from '@/lib/i18n';

const KEY = 'nexa-recent-tools-v1';

export function rememberTool(slug: string) {
  if (typeof window === 'undefined') return;

  try {
    const current = JSON.parse(
      localStorage.getItem(KEY) ?? '[]',
    ) as string[];

    const next = [
      slug,
      ...current.filter(
        (item) => item !== slug,
      ),
    ].slice(0, 6);

    localStorage.setItem(
      KEY,
      JSON.stringify(next),
    );
  } catch {}
}

export function RecentTools({
  locale,
}: {
  locale: AppLocale;
}) {
  const [slugs, setSlugs] =
    useState<string[]>([]);

  useEffect(() => {
    try {
      setSlugs(
        JSON.parse(
          localStorage.getItem(KEY) ?? '[]',
        ) as string[],
      );
    } catch {
      setSlugs([]);
    }
  }, []);

  const tools = slugs
    .map((slug) =>
      aiTools.find(
        (tool) => tool.slug === slug,
      ),
    )
    .filter(Boolean);

  if (!tools.length) return null;

  const ar = locale === 'ar';

  return (
    <div className="mb-5">
      <div className="muted mb-2 flex items-center gap-2 text-xs font-bold">
        <Clock3 size={14} />
        {ar
          ? 'استخدمتها مؤخرًا'
          : 'Recently used'}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tools.map((tool) => {
          if (!tool) return null;

          const localized =
            localizeTool(tool, locale);

          return (
            <Link
              key={tool.slug}
              href={
                tool.slug === 'chat'
                  ? '/dashboard/ai/chat'
                  : `/dashboard/ai/${tool.slug}`
              }
              className="surface flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <tool.icon size={15} />
              {localized.displayTitle}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

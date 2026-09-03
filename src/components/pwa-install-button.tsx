'use client';

import {
  useEffect,
  useState,
} from 'react';
import { Download } from 'lucide-react';

type BeforeInstallPromptEvent =
  Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
  };

export function PwaInstallButton({
  locale,
}: {
  locale: 'ar' | 'en';
}) {
  const [event, setEvent] =
    useState<BeforeInstallPromptEvent | null>(
      null,
    );

  useEffect(() => {
    const handler = (raw: Event) => {
      raw.preventDefault();
      setEvent(
        raw as BeforeInstallPromptEvent,
      );
    };

    window.addEventListener(
      'beforeinstallprompt',
      handler,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handler,
      );
    };
  }, []);

  if (!event) return null;

  return (
    <button
      onClick={async () => {
        await event.prompt();
        await event.userChoice;
        setEvent(null);
      }}
      className="muted grid size-9 place-items-center rounded-xl transition hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
      title={
        locale === 'ar'
          ? 'تثبيت Nexa AI كتطبيق'
          : 'Install Nexa AI'
      }
      aria-label={
        locale === 'ar'
          ? 'تثبيت التطبيق'
          : 'Install app'
      }
    >
      <Download size={17} />
    </button>
  );
}

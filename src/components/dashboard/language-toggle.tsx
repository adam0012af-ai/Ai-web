'use client';

import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getDashboardText } from '@/lib/i18n';

export function LanguageToggle({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const t = getDashboardText(locale);

  function toggleLocale() {
    const nextLocale: AppLocale = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `nexa_locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      onClick={toggleLocale}
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      title={t.language}
      className="gap-1.5 px-2.5"
    >
      <Languages size={17} />
      <span className="hidden text-xs font-bold sm:inline">{t.language}</span>
    </Button>
  );
}

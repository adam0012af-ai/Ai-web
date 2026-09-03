'use client';

import { ThemeProvider } from 'next-themes';

import { PwaRegister } from '@/components/pwa-register';

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PwaRegister />
      {children}
    </ThemeProvider>
  );
}

import type { Metadata, Viewport } from 'next';

import './globals.css';
import { Providers } from '@/components/providers';
import { getAppUrl } from '@/lib/app-url';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: '#f7f8fb',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#090b10',
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: 'Nexa AI — One workspace for practical AI',
    template: '%s | Nexa AI',
  },
  description:
    'A reliable multi-provider AI workspace for writing, analysis, coding, research, documents, images, and team workflows.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Nexa AI',
  appleWebApp: {
    capable: true,
    title: 'Nexa AI',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/nexa-icon.svg',
    apple: '/nexa-icon.svg',
  },
  openGraph: {
    type: 'website',
    title: 'Nexa AI',
    description: 'Reliable AI workflows in one modern workspace.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexa AI',
    short_name: 'Nexa AI',
    description:
      'A resilient multi-provider AI workspace for writing, analysis, coding, documents, and images.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#090b10',
    theme_color: '#6d5dfc',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/nexa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/nexa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}

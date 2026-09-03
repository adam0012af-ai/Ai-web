'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getAdminMessages } from '@/lib/admin-messages';
import type { AppLocale } from '@/lib/i18n';

type ProviderRow = {
  id: string;
  provider: string;
  enabled: boolean;
  priority: number;
  defaultModel: string;
  status: string;
  averageLatency: number;
  lastError: string | null;
};

async function csrf() {
  return (await fetch('/api/csrf').then((response) => response.json())).token;
}

export function ProviderTable({
  rows,
  canEdit,
  locale,
}: {
  rows: ProviderRow[];
  canEdit: boolean;
  locale: AppLocale;
}) {
  const router = useRouter();
  const messages = getAdminMessages(locale);
  const t = messages.providers;
  const common = messages.common;

  async function patch(id: string, data: Record<string, unknown>) {
    const token = await csrf();
    const response = await fetch(`/api/admin/ai/providers/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) router.refresh();
  }

  function statusLabel(status: string) {
    if (status === 'HEALTHY') return common.healthy;
    if (status === 'DEGRADED') return common.degraded;
    if (status === 'OFFLINE') return common.offline;
    if (status === 'COOLDOWN') return common.cooldown;
    return status;
  }

  return (
    <div className="surface overflow-x-auto rounded-2xl" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <table className="w-full min-w-[900px] text-start text-sm">
        <thead>
          <tr className="border-b border-[var(--line)]">
            <th className="p-4">{common.provider}</th>
            <th>{common.enabled}</th>
            <th>{common.priority}</th>
            <th>{t.health}</th>
            <th>{t.defaultModel}</th>
            <th>{common.averageLatency}</th>
            <th>{common.lastError}</th>
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((provider) => (
            <tr key={provider.id} className="border-b border-[var(--line)] last:border-0">
              <td className="p-4 font-black">{provider.provider}</td>
              <td>{provider.enabled ? common.yes : common.no}</td>
              <td>
                <input
                  aria-label={t.priorityAria}
                  disabled={!canEdit}
                  defaultValue={provider.priority}
                  className="w-16 rounded-lg border border-[var(--line)] bg-transparent px-2 py-1"
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value !== provider.priority) {
                      void patch(provider.id, { priority: value });
                    }
                  }}
                />
              </td>
              <td>{statusLabel(provider.status)}</td>
              <td className="max-w-56 truncate" dir="ltr">
                {provider.defaultModel}
              </td>
              <td>{provider.averageLatency} ms</td>
              <td className="muted max-w-48 truncate">{provider.lastError ?? '—'}</td>
              <td>
                <Button
                  variant="secondary"
                  disabled={!canEdit}
                  onClick={() => void patch(provider.id, { enabled: !provider.enabled })}
                >
                  {provider.enabled ? common.disable : common.enable}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

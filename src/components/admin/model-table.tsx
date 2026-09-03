'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getAdminMessages } from '@/lib/admin-messages';
import type { AppLocale } from '@/lib/i18n';

type ModelRow = {
  id: string;
  provider: string;
  modelId: string;
  displayName: string;
  feature: string | null;
  enabled: boolean;
  isDefault: boolean;
  priority: number;
};

async function csrf() {
  return (await fetch('/api/csrf').then((response) => response.json())).token;
}

export function ModelTable({ rows, locale }: { rows: ModelRow[]; locale: AppLocale }) {
  const router = useRouter();
  const messages = getAdminMessages(locale);
  const t = messages.models;
  const common = messages.common;

  async function patch(id: string, data: Record<string, unknown>) {
    const token = await csrf();
    const response = await fetch(`/api/admin/ai/models/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) router.refresh();
  }

  return (
    <div className="surface overflow-x-auto rounded-2xl" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <table className="w-full min-w-[950px] text-start text-sm">
        <thead>
          <tr className="border-b border-[var(--line)]">
            <th className="p-4">{common.provider}</th>
            <th>{t.model}</th>
            <th>{t.feature}</th>
            <th>{common.enabled}</th>
            <th>{common.default}</th>
            <th>{common.priority}</th>
            <th>{common.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((model) => (
            <tr key={model.id} className="border-b border-[var(--line)] last:border-0">
              <td className="p-4 font-bold">{model.provider}</td>
              <td>
                <div className="font-semibold">{model.displayName}</div>
                <div className="muted max-w-64 truncate text-[11px]" dir="ltr">
                  {model.modelId}
                </div>
              </td>
              <td>
                <input
                  defaultValue={model.feature ?? ''}
                  placeholder={t.placeholderAll}
                  className="w-36 rounded-lg border border-[var(--line)] bg-transparent px-2 py-1"
                  onBlur={(event) => {
                    const value = event.target.value.trim() || null;
                    if (value !== model.feature) void patch(model.id, { feature: value });
                  }}
                />
              </td>
              <td>{model.enabled ? common.yes : common.no}</td>
              <td>{model.isDefault ? common.yes : common.no}</td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={model.priority}
                  className="w-16 rounded-lg border border-[var(--line)] bg-transparent px-2 py-1"
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value !== model.priority) {
                      void patch(model.id, { priority: value });
                    }
                  }}
                />
              </td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void patch(model.id, { enabled: !model.enabled })}
                  >
                    {model.enabled ? common.disable : common.enable}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={model.isDefault}
                    onClick={() => void patch(model.id, { isDefault: true })}
                  >
                    {common.setDefault}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

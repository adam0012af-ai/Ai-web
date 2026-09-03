'use client';

import { useRouter } from 'next/navigation';

import { getAdminMessages } from '@/lib/admin-messages';
import type { AppLocale } from '@/lib/i18n';

type Plan = {
  id: string;
  name: string;
  dailyRequests: number;
  maxPromptChars: number;
  maxFileMb: number;
  imageAnalysesDaily: number;
};

async function csrf() {
  return (await fetch('/api/csrf').then((response) => response.json())).token;
}

export function PlanTable({ plans, locale }: { plans: Plan[]; locale: AppLocale }) {
  const router = useRouter();
  const t = getAdminMessages(locale).subscriptions;

  async function save(id: string, key: string, value: number) {
    const token = await csrf();
    const response = await fetch(`/api/admin/plans/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token,
      },
      body: JSON.stringify({ [key]: value }),
    });
    if (response.ok) router.refresh();
  }

  const fields = [
    ['dailyRequests', t.dailyRequests],
    ['maxPromptChars', t.promptChars],
    ['maxFileMb', t.fileMb],
    ['imageAnalysesDaily', t.imageDaily],
  ] as const;

  return (
    <div className="surface mt-6 overflow-x-auto rounded-2xl" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <table className="w-full min-w-[850px] text-start text-sm">
        <thead>
          <tr className="border-b border-[var(--line)]">
            <th className="p-4">{locale === 'ar' ? 'الخطة' : 'Plan'}</th>
            {fields.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className="border-b border-[var(--line)] last:border-0">
              <td className="p-4 font-black">{plan.name}</td>
              {fields.map(([key]) => (
                <td key={key}>
                  <input
                    type="number"
                    min={0}
                    defaultValue={plan[key]}
                    className="w-28 rounded-lg border border-[var(--line)] bg-transparent px-2 py-1"
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value !== plan[key]) {
                        void save(plan.id, key, value);
                      }
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

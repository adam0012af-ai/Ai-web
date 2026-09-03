import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="muted text-xs font-semibold">{label}</div>
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-3xl font-black">{value}</div>
      {detail ? <div className="muted mt-2 text-xs">{detail}</div> : null}
    </Card>
  );
}

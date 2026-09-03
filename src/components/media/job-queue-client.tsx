'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, RefreshCw, Trash2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';
import { getMediaMessages } from '@/lib/media-messages';
import { getCsrfToken } from '@/lib/client/media-api';

type Job = {
  id: string;
  title: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
  operation: string;
  status:
    | 'DRAFT'
    | 'WAITING_PROVIDER'
    | 'QUEUED'
    | 'PROCESSING'
    | 'RENDERING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELED';
  progress: number;
  favorite: boolean;
  attempts: number;
  error: string | null;
  projectName: string | null;
  createdAt: string;
};

export function JobQueueClient({
  locale,
  jobs,
}: {
  locale: AppLocale;
  jobs: Job[];
}) {
  const router = useRouter();
  const t = getMediaMessages(locale);
  const [filter, setFilter] = useState<'ALL' | Job['kind']>('ALL');
  const [busyId, setBusyId] = useState('');

  const visible = useMemo(
    () => (filter === 'ALL' ? jobs : jobs.filter((job) => job.kind === filter)),
    [filter, jobs],
  );

  async function patch(id: string, action: 'cancel' | 'retry' | 'favorite') {
    setBusyId(id);
    try {
      const token = await getCsrfToken();
      await fetch(`/api/media/jobs/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusyId('');
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      const token = await getCsrfToken();
      await fetch(`/api/media/jobs/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': token },
      });
      router.refresh();
    } finally {
      setBusyId('');
    }
  }

  const filters = [
    ['ALL', t.jobs.all],
    ['VIDEO', t.jobs.VIDEO],
    ['IMAGE', t.jobs.IMAGE],
    ['AUDIO', t.jobs.AUDIO],
  ] as const;

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              filter === id
                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'border-[var(--line)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!visible.length ? (
        <div className="surface rounded-2xl p-8 text-center">
          <p className="muted text-sm">{t.studio.noJobs}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((job) => {
            const operation =
              t.jobs.operations[job.operation as keyof typeof t.jobs.operations] ??
              job.operation;

            return (
              <article key={job.id} className="surface rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="truncate">{job.title}</b>
                      {job.favorite ? (
                        <Heart size={14} className="fill-current text-red-500" />
                      ) : null}
                    </div>
                    <div className="muted mt-1 text-xs">
                      {operation} · {t.jobs[job.kind]}
                      {job.projectName ? ` · ${job.projectName}` : ''}
                    </div>
                  </div>
                  <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs font-bold">
                    {t.jobs.statuses[job.status]}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className="brand-gradient h-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }}
                  />
                </div>

                <div className="muted mt-2 flex flex-wrap justify-between gap-2 text-[11px]">
                  <span>{t.common.progress}: {job.progress}%</span>
                  <span>
                    {new Date(job.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en')}
                  </span>
                </div>

                {job.error ? (
                  <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-600">
                    {job.error}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    disabled={busyId === job.id}
                    onClick={() => void patch(job.id, 'favorite')}
                  >
                    <Heart size={14} />
                    {t.common.favorite}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    disabled={busyId === job.id}
                    onClick={() => void patch(job.id, 'retry')}
                  >
                    <RefreshCw size={14} />
                    {t.common.retry}
                  </Button>
                  {!['COMPLETED', 'CANCELED'].includes(job.status) ? (
                    <Button
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      disabled={busyId === job.id}
                      onClick={() => void patch(job.id, 'cancel')}
                    >
                      <XCircle size={14} />
                      {t.common.cancel}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-xs text-red-500"
                    disabled={busyId === job.id}
                    onClick={() => void remove(job.id)}
                  >
                    <Trash2 size={14} />
                    {t.common.delete}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

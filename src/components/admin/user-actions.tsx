'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/lib/i18n';

async function csrf() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data?.token) throw new Error('csrf');
  return data.token as string;
}

export function UserActions({
  id,
  role,
  suspended,
  canEdit,
  locale,
}: {
  id: string;
  role: string;
  suspended: boolean;
  canEdit: boolean;
  locale: AppLocale;
}) {
  const router = useRouter();
  const ar = locale === 'ar';
  const [pending, setPending] = useState('');

  const t = ar
    ? {
        activate: 'إعادة التفعيل',
        suspend: 'تعليق الحساب',
        reset: 'إعادة حد AI اليومي',
        delete: 'حذف المستخدم',
        deleteConfirm: 'سيتم حذف هذا المستخدم وكل البيانات المرتبطة به نهائيًا. هل تريد المتابعة؟',
        failed: 'تعذر تنفيذ الإجراء.',
        deleteFailed: 'تعذر حذف المستخدم.',
        role: 'تغيير الدور',
      }
    : {
        activate: 'Reactivate',
        suspend: 'Suspend account',
        reset: 'Reset daily AI limit',
        delete: 'Delete user',
        deleteConfirm: 'Delete this user and all related data permanently? This cannot be undone.',
        failed: 'Action failed.',
        deleteFailed: 'Delete failed.',
        role: 'Change role',
      };

  async function patch(data: Record<string, unknown>, key: string) {
    if (pending) return;
    setPending(key);

    try {
      const token = await csrf();
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(!ar && body?.error ? body.error : t.failed);
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : t.failed);
    } finally {
      setPending('');
    }
  }

  async function removeUser() {
    if (pending || !confirm(t.deleteConfirm)) return;
    setPending('delete');

    try {
      const token = await csrf();
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': token },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(!ar && body?.error ? body.error : t.deleteFailed);
      }

      router.push('/admin/users');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : t.deleteFailed);
      setPending('');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        disabled={Boolean(pending)}
        onClick={() => patch({ action: suspended ? 'activate' : 'suspend' }, 'status')}
      >
        {suspended ? t.activate : t.suspend}
      </Button>

      <Button
        variant="secondary"
        disabled={Boolean(pending)}
        onClick={() => patch({ action: 'reset-limit' }, 'reset')}
      >
        {t.reset}
      </Button>

      {canEdit ? (
        <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm">
          <span className="muted hidden text-xs sm:inline">{t.role}</span>
          <select
            value={role}
            disabled={Boolean(pending)}
            onChange={(event) => patch({ action: 'role', role: event.target.value }, 'role')}
            className="h-10 bg-transparent font-bold outline-none"
          >
            <option>USER</option>
            <option>ADMIN</option>
            <option>SUPER_ADMIN</option>
          </select>
        </label>
      ) : null}

      {canEdit ? (
        <Button variant="danger" disabled={Boolean(pending)} onClick={() => void removeUser()}>
          {t.delete}
        </Button>
      ) : null}
    </div>
  );
}

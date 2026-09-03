'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  Code2,
  Download,
  FileCode2,
  FileText,
  FolderTree,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
  Wrench,
} from 'lucide-react';

import { MarkdownMessage } from '@/components/ai/markdown-message';
import type { AppLocale } from '@/lib/i18n';

type InspectedFile = {
  path: string;
  size: number;
  text: boolean;
  content: string | null;
};

type Inspection = {
  archive: { name: string; size: number; extractedBytes: number };
  project: {
    framework: string;
    packageName: string | null;
    fileCount: number;
    textFileCount: number;
    languages: { name: string; count: number }[];
  };
  files: InspectedFile[];
  warnings: string[];
};

type RunMeta = {
  summary: string;
  notes: string[];
  changes: { path: string; reason: string }[];
  framework: string;
  provider?: string;
  model?: string;
  latency?: number;
};

type Mode = 'analyze' | 'fix' | 'build' | 'audit';

const MAX_ZIP_BYTES = Math.floor(3.5 * 1024 * 1024);

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function decodeMeta(value: string | null): RunMeta | null {
  if (!value) return null;
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as RunMeta;
  } catch {
    return null;
  }
}

export function CodeStudioClient({ locale }: { locale: AppLocale }) {
  const ar = locale === 'ar';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [archive, setArchive] = useState<File | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [activePath, setActivePath] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('analyze');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState<'inspect' | 'run' | ''>('');
  const [error, setError] = useState('');
  const [report, setReport] = useState('');
  const [meta, setMeta] = useState<RunMeta | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const t = ar
    ? {
        title: 'Nexa Code Studio',
        subtitle: 'ارفع سورس ZIP كامل، افحص المشروع، اطلب إصلاحًا أو ميزة، واستلم ZIP جديد بالتعديلات.',
        upload: 'ارفع مشروع ZIP',
        uploadHint: 'حتى 3.5 MB مضغوط حاليًا. احذف node_modules وملفات البناء والوسائط الكبيرة قبل الرفع؛ ملفات الأسرار لا تُرسل للذكاء الاصطناعي.',
        invalidZip: 'اختر ملف ZIP صالح.',
        zipTooLarge: 'الحد الحالي على الاستضافة هو 3.5 MB للملف المضغوط. احذف node_modules وملفات البناء والوسائط الكبيرة ثم أعد الضغط.',
        choose: 'اختيار ملف ZIP',
        inspect: 'جاري فحص المشروع…',
        project: 'المشروع',
        files: 'الملفات',
        search: 'ابحث داخل أسماء الملفات…',
        preview: 'معاينة الملف',
        noPreview: 'هذا الملف ثنائي أو كبير؛ يظهر في المشروع لكنه لا يُعرض كنص هنا.',
        selected: 'ضمن سياق AI',
        addContext: 'أضف للسياق',
        removeContext: 'إزالة من السياق',
        analyze: 'تحليل',
        fix: 'إصلاح',
        build: 'بناء ميزة',
        audit: 'مراجعة شاملة',
        analyzeHint: 'اشرح المشروع أو جزءًا منه بدون تعديل الملفات.',
        fixHint: 'حدد المشكلة المطلوبة، وسيُنتج Nexa ZIP جديدًا بالتعديلات الآمنة.',
        buildHint: 'صف الميزة الجديدة، وسيُنشئ Nexa الملفات/التعديلات المطلوبة داخل نسخة ZIP جديدة.',
        auditHint: 'راجع الأمان والأخطاء والأداء وجودة الكود ورتّب المشاكل حسب الخطورة.',
        instruction: 'اكتب المطلوب من Nexa في هذا المشروع…',
        run: 'تشغيل Nexa Code',
        working: 'Nexa يقرأ الملفات ذات الصلة ويعمل على الطلب…',
        result: 'النتيجة',
        changes: 'الملفات المعدلة',
        download: 'تنزيل المشروع المعدل ZIP',
        safe: 'Nexa لا يشغّل الكود المرفوع على الخادم. التحليل والتعديل يتمان على محتوى السورس فقط.',
        warning: 'تنبيهات الفحص',
        reset: 'رفع مشروع آخر',
        framework: 'الإطار',
        count: 'ملفات',
        readable: 'نصية',
        context: 'ملفات السياق',
        provider: 'المزود',
      }
    : {
        title: 'Nexa Code Studio',
        subtitle: 'Upload a full source ZIP, inspect it, request a fix or feature, and receive a new modified ZIP.',
        upload: 'Upload project ZIP',
        uploadHint: 'Up to 3.5 MB compressed for this deployment. Remove node_modules, build output, and large media before upload; secret files are excluded from AI context.',
        invalidZip: 'Choose a valid ZIP file.',
        zipTooLarge: 'This deployment currently accepts ZIP files up to 3.5 MB compressed. Remove node_modules, build output, and large media, then compress again.',
        choose: 'Choose ZIP file',
        inspect: 'Inspecting project…',
        project: 'Project',
        files: 'Files',
        search: 'Search filenames…',
        preview: 'File preview',
        noPreview: 'This file is binary or too large. It remains in the project but is not shown as text here.',
        selected: 'In AI context',
        addContext: 'Add to context',
        removeContext: 'Remove from context',
        analyze: 'Analyze',
        fix: 'Fix',
        build: 'Build feature',
        audit: 'Audit',
        analyzeHint: 'Explain the project or selected source without changing files.',
        fixHint: 'Describe a bug and Nexa will produce a new ZIP containing safe source edits.',
        buildHint: 'Describe a feature and Nexa will create the needed source edits in a new ZIP.',
        auditHint: 'Review security, bugs, performance, and maintainability by severity.',
        instruction: 'Describe what Nexa should do in this project…',
        run: 'Run Nexa Code',
        working: 'Nexa is reading relevant source and working on the request…',
        result: 'Result',
        changes: 'Changed files',
        download: 'Download modified project ZIP',
        safe: 'Nexa does not execute uploaded code on the server. Analysis and edits operate on source content only.',
        warning: 'Inspection warnings',
        reset: 'Upload another project',
        framework: 'Framework',
        count: 'files',
        readable: 'text',
        context: 'context files',
        provider: 'Provider',
      };

  const modes = [
    { id: 'analyze' as const, label: t.analyze, hint: t.analyzeHint, icon: Code2 },
    { id: 'fix' as const, label: t.fix, hint: t.fixHint, icon: Wrench },
    { id: 'build' as const, label: t.build, hint: t.buildHint, icon: WandSparkles },
    { id: 'audit' as const, label: t.audit, hint: t.auditHint, icon: ShieldCheck },
  ];

  useEffect(() => {
    return () => {
      if (download?.url) URL.revokeObjectURL(download.url);
    };
  }, [download?.url]);

  const filteredFiles = useMemo(() => {
    if (!inspection) return [];
    const needle = query.trim().toLowerCase();
    return inspection.files.filter((file) => !needle || file.path.toLowerCase().includes(needle));
  }, [inspection, query]);

  const activeFile = inspection?.files.find((file) => file.path === activePath) ?? null;

  async function csrf() {
    const response = await fetch('/api/csrf', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data?.token) throw new Error(ar ? 'تعذر بدء الطلب الآمن.' : 'Unable to start a secure request.');
    return data.token as string;
  }

  async function inspect(file: File) {
    setError('');

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError(t.invalidZip);
      return;
    }

    if (file.size <= 0 || file.size > MAX_ZIP_BYTES) {
      setError(t.zipTooLarge);
      return;
    }

    setArchive(file);
    setInspection(null);
    setActivePath('');
    setSelectedPaths([]);
    setReport('');
    setMeta(null);
    if (download?.url) URL.revokeObjectURL(download.url);
    setDownload(null);
    setBusy('inspect');

    try {
      const token = await csrf();
      const body = new FormData();
      body.set('archive', file);

      const response = await fetch('/api/code/inspect', {
        method: 'POST',
        headers: { 'x-csrf-token': token },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || (ar ? 'تعذر قراءة المشروع.' : 'Unable to inspect project.'));

      const next = data as Inspection;
      setInspection(next);
      const first = next.files.find((item) => item.text && item.content !== null) ?? next.files[0];
      setActivePath(first?.path ?? '');

      const suggested = next.files
        .filter((item) => /(^|\/)(package\.json|tsconfig\.json|schema\.prisma|readme[^/]*)$/i.test(item.path))
        .slice(0, 6)
        .map((item) => item.path);
      setSelectedPaths(suggested);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ar ? 'تعذر قراءة المشروع.' : 'Unable to inspect project.');
    } finally {
      setBusy('');
    }
  }

  function toggleContext(path: string) {
    setSelectedPaths((current) =>
      current.includes(path) ? current.filter((item) => item !== path) : [...current, path].slice(-16),
    );
  }

  async function run() {
    if (!archive || busy) return;
    if (mode !== 'audit' && !instruction.trim()) {
      setError(ar ? 'اكتب المطلوب من Nexa أولًا.' : 'Describe what you want Nexa to do first.');
      return;
    }

    setBusy('run');
    setError('');
    setReport('');
    setMeta(null);
    if (download?.url) URL.revokeObjectURL(download.url);
    setDownload(null);

    try {
      const token = await csrf();
      const body = new FormData();
      body.set('archive', archive);
      body.set('mode', mode);
      body.set('instruction', instruction);
      body.set('selectedPaths', JSON.stringify(selectedPaths));

      const response = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'x-csrf-token': token },
        body,
      });

      const contentType = response.headers.get('content-type') ?? '';

      if (!response.ok) {
        const data = contentType.includes('application/json') ? await response.json() : null;
        if (data?.report) setReport(data.report);
        throw new Error(data?.error || (ar ? 'تعذر تنفيذ الطلب.' : 'Unable to process request.'));
      }

      if (contentType.includes('application/zip')) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const disposition = response.headers.get('content-disposition') ?? '';
        const matched = disposition.match(/filename="([^"]+)"/i);
        const name = matched?.[1] ?? 'nexa-code-project.zip';
        const nextMeta = decodeMeta(response.headers.get('x-nexa-code-meta'));
        setMeta(nextMeta);
        setReport(nextMeta?.summary ?? '');
        setDownload({ url, name });
      } else {
        const data = await response.json();
        setReport(data.report ?? '');
        setMeta({
          summary: data.report ?? '',
          notes: [],
          changes: [],
          framework: data.project?.framework ?? inspection?.project.framework ?? '',
          provider: data.provider,
          model: data.model,
          latency: data.latency,
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ar ? 'تعذر تنفيذ الطلب.' : 'Unable to process request.');
    } finally {
      setBusy('');
    }
  }

  if (!inspection) {
    return (
      <div className="mx-auto max-w-5xl" dir={ar ? 'rtl' : 'ltr'}>
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
            <Code2 size={28} />
          </div>
          <h1 className="mt-5 text-3xl font-black sm:text-4xl">{t.title}</h1>
          <p className="muted mx-auto mt-3 max-w-2xl leading-7">{t.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void inspect(file);
          }}
          className={`surface flex min-h-80 w-full flex-col items-center justify-center rounded-[32px] border-2 border-dashed p-8 text-center transition ${dragging ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-[var(--line)]'}`}
        >
          {busy === 'inspect' ? <LoaderCircle className="animate-spin text-[var(--brand)]" size={34} /> : <Upload className="text-[var(--brand)]" size={34} />}
          <b className="mt-5 text-lg">{busy === 'inspect' ? t.inspect : t.upload}</b>
          <span className="muted mt-2 max-w-xl text-sm leading-6">{t.uploadHint}</span>
          <span className="mt-5 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-black text-white">{t.choose}</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void inspect(file);
          }}
        />

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--line)] p-4 text-start">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--brand)]" size={18} />
          <p className="muted text-sm leading-6">{t.safe}</p>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-600">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={ar ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Archive size={18} className="text-[var(--brand)]" />
            <h1 className="truncate text-xl font-black">{inspection.archive.name}</h1>
          </div>
          <div className="muted mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>{t.framework}: {inspection.project.framework}</span>
            <span>{inspection.project.fileCount} {t.count}</span>
            <span>{inspection.project.textFileCount} {t.readable}</span>
            <span>{selectedPaths.length} {t.context}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setArchive(null);
            setInspection(null);
            setReport('');
            setMeta(null);
            if (download?.url) URL.revokeObjectURL(download.url);
            setDownload(null);
          }}
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold"
        >
          {t.reset}
        </button>
      </div>

      <div className="grid min-h-[660px] overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--card)] xl:grid-cols-[270px_minmax(0,1fr)_380px]">
        <aside className="border-b border-[var(--line)] p-3 xl:border-b-0 xl:border-e">
          <div className="flex items-center gap-2 px-2 py-2 font-black">
            <FolderTree size={17} className="text-[var(--brand)]" />
            {t.files}
          </div>
          <label className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3">
            <Search size={15} className="muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="mt-3 max-h-[560px] overflow-y-auto">
            {filteredFiles.map((file) => {
              const selected = selectedPaths.includes(file.path);
              return (
                <div key={file.path} className={`group flex items-center gap-1 rounded-xl ${activePath === file.path ? 'bg-[var(--brand)]/10' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setActivePath(file.path)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-start text-xs"
                    title={file.path}
                  >
                    {file.text ? <FileCode2 size={14} className="shrink-0" /> : <FileText size={14} className="muted shrink-0" />}
                    <span className="truncate">{file.path}</span>
                  </button>
                  {file.text ? (
                    <button
                      type="button"
                      onClick={() => toggleContext(file.path)}
                      className={`me-1 grid size-7 shrink-0 place-items-center rounded-lg ${selected ? 'bg-[var(--brand)] text-white' : 'muted hover:bg-black/[.05] dark:hover:bg-white/[.06]'}`}
                      title={selected ? t.removeContext : t.addContext}
                    >
                      {selected ? <Check size={13} /> : <Sparkles size={13} />}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 border-b border-[var(--line)] xl:border-b-0 xl:border-e">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--line)] px-4">
            <div className="min-w-0">
              <b className="block truncate text-sm">{activeFile?.path ?? t.preview}</b>
              {activeFile ? <span className="muted text-[11px]">{formatBytes(activeFile.size)}</span> : null}
            </div>
            {activeFile?.text ? (
              <button
                type="button"
                onClick={() => toggleContext(activeFile.path)}
                className={`rounded-xl px-3 py-2 text-xs font-black ${selectedPaths.includes(activeFile.path) ? 'bg-[var(--brand)] text-white' : 'border border-[var(--line)]'}`}
              >
                {selectedPaths.includes(activeFile.path) ? t.selected : t.addContext}
              </button>
            ) : null}
          </div>
          <div className="h-[605px] overflow-auto bg-black/[.015] p-4 dark:bg-black/20">
            {activeFile?.content !== null && activeFile?.content !== undefined ? (
              <pre dir="ltr" className="min-w-max whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-start">{activeFile.content}</pre>
            ) : (
              <div className="muted grid h-full place-items-center text-center text-sm">{t.noPreview}</div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col p-4">
          <div className="grid grid-cols-2 gap-2">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={`rounded-2xl border p-3 text-start transition ${mode === item.id ? 'border-[var(--brand)] bg-[var(--brand)]/10' : 'border-[var(--line)]'}`}
                >
                  <Icon size={17} className="text-[var(--brand)]" />
                  <b className="mt-2 block text-sm">{item.label}</b>
                </button>
              );
            })}
          </div>

          <p className="muted mt-3 text-xs leading-5">{modes.find((item) => item.id === mode)?.hint}</p>

          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder={mode === 'audit' ? t.auditHint : t.instruction}
            rows={7}
            className="mt-4 w-full resize-none rounded-2xl border border-[var(--line)] bg-transparent p-3 text-start text-sm leading-6 outline-none focus:border-[var(--brand)]"
          />

          <button
            type="button"
            onClick={() => void run()}
            disabled={busy === 'run'}
            className="brand-gradient mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white disabled:opacity-50"
          >
            {busy === 'run' ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {busy === 'run' ? t.working : t.run}
          </button>

          {error ? <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs leading-5 text-red-600">{error}</div> : null}

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-[var(--line)] pt-4">
            {report ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm">{t.result}</b>
                  {meta?.provider ? <span className="muted text-[10px]">{t.provider}: {meta.provider}</span> : null}
                </div>
                <div className="mt-3 text-sm leading-6">
                  <MarkdownMessage content={report} />
                </div>
              </div>
            ) : null}

            {meta?.changes?.length ? (
              <div className="mt-5">
                <b className="text-sm">{t.changes}</b>
                <div className="mt-2 space-y-2">
                  {meta.changes.map((change) => (
                    <div key={change.path} className="rounded-xl bg-black/[.035] p-3 text-xs dark:bg-white/[.04]">
                      <b className="block break-all" dir="ltr">{change.path}</b>
                      {change.reason ? <p className="muted mt-1 leading-5">{change.reason}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {download ? (
              <a
                href={download.url}
                download={download.name}
                className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"
              >
                <Download size={17} />
                {t.download}
              </a>
            ) : null}
          </div>

          <div className="muted mt-3 flex items-start gap-2 border-t border-[var(--line)] pt-3 text-[10px] leading-4">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--brand)]" />
            <span>{t.safe}</span>
          </div>
        </aside>
      </div>

      {inspection.warnings.length ? (
        <details className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-black">
            <AlertTriangle size={16} /> {t.warning} ({inspection.warnings.length})
          </summary>
          <div className="muted mt-3 space-y-1 text-xs">
            {inspection.warnings.slice(0, 20).map((warning) => <div key={warning}>{warning}</div>)}
          </div>
        </details>
      ) : null}
    </div>
  );
}

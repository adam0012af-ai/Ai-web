'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { AppLocale } from '@/lib/i18n';

type ImagePayload = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
};

export function ToolRunner({
  slug,
  title,
  description,
  locale,
}: {
  slug: string;
  title: string;
  description: string;
  locale: AppLocale;
}) {
  const ar = locale === 'ar';
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [cached, setCached] = useState(false);
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const isImage = slug === 'image';
  const isDocument = slug === 'document';

  const labels = useMemo(
    () =>
      ar
        ? {
            input: 'المدخلات',
            output: 'نتيجة AI',
            clear: 'مسح',
            generate: 'تنفيذ',
            generating: 'جاري التنفيذ…',
            copy: 'نسخ',
            copied: 'تم النسخ',
            download: 'تنزيل',
            chooseImage: 'اختر صورة',
            chooseDocument: 'تحميل ملف نصي',
            imageHint: 'PNG / JPG / WEBP بحد أقصى 2.5 MB',
            documentHint:
              'TXT / MD / CSV / JSON / HTML / JS / TS وغيرها. يُقرأ محليًا ولا يتم تخزين الملف.',
            placeholder: `اكتب بالتفصيل ما تريد من ${title}…`,
            imagePlaceholder:
              'مثال: حلّل الصورة بالتفصيل، استخرج النصوص، واشرح العناصر المهمة.',
            resultPlaceholder: 'ستظهر النتيجة هنا.',
            routed: 'تم التنفيذ عبر نظام AI متعدد المزودين.',
            fallback: 'تم استخدام المزود الاحتياطي بنجاح.',
            cache: 'تم إرجاع نتيجة محفوظة لتوفير الاستهلاك.',
            fileTooLarge: 'الملف أكبر من الحد المسموح.',
            badImage: 'استخدم صورة JPG أو PNG أو WEBP.',
            readError: 'تعذر قراءة الملف.',
          }
        : {
            input: 'Your input',
            output: 'AI output',
            clear: 'Clear',
            generate: 'Generate',
            generating: 'Generating…',
            copy: 'Copy',
            copied: 'Copied',
            download: 'Download',
            chooseImage: 'Choose image',
            chooseDocument: 'Load text file',
            imageHint: 'PNG / JPG / WEBP up to 2.5 MB',
            documentHint:
              'TXT / MD / CSV / JSON / HTML / JS / TS and similar. Read locally; the file itself is not stored.',
            placeholder: `Describe what you want ${title} to do…`,
            imagePlaceholder:
              'Example: analyze the image in detail, extract visible text, and explain important elements.',
            resultPlaceholder: 'Your generated result will appear here.',
            routed: 'Processed through the multi-provider AI router.',
            fallback: 'A fallback provider completed this request.',
            cache: 'A cached result was used to reduce API usage.',
            fileTooLarge: 'The selected file is too large.',
            badImage: 'Use a JPG, PNG, or WEBP image.',
            readError: 'Unable to read this file.',
          },
    [ar, title],
  );

  async function getCsrf() {
    const response = await fetch('/api/csrf', { cache: 'no-store' });

    if (!response.ok) throw new Error('Unable to start a secure request.');

    const data = await response.json();

    if (!data?.token) throw new Error('Security token is missing.');

    return data.token as string;
  }

  async function run() {
    const effectiveInput =
      input.trim() ||
      (isImage
        ? ar
          ? 'حلّل هذه الصورة بدقة. صف المحتوى، استخرج أي نص ظاهر، واذكر أهم الملاحظات والاستنتاجات مع توضيح عدم اليقين.'
          : 'Analyze this image carefully. Describe the content, extract visible text, and provide the most important observations while stating uncertainty.'
        : '');

    if (!effectiveInput || busy) return;

    if (isImage && !image) {
      setError(ar ? 'اختر صورة أولًا.' : 'Choose an image first.');
      return;
    }

    setBusy(true);
    setError('');
    setFallbackUsed(false);
    setCached(false);

    try {
      const token = await getCsrf();

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          feature: slug,
          input: effectiveInput,
          images: image ? [image] : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to generate');
      }

      setOut(data.text ?? '');
      setFallbackUsed(Boolean(data.fallbackUsed));
      setCached(Boolean(data.cached));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to generate',
      );
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    setInput('');
    setOut('');
    setError('');
    setFallbackUsed(false);
    setCached(false);
    setImage(null);
    setImagePreview('');
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      setError(labels.badImage);
      event.target.value = '';
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setError(labels.fileTooLarge);
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error(labels.readError));
        reader.readAsDataURL(file);
      });

      const data = dataUrl.split(',')[1] ?? '';

      setImage({
        mimeType: file.type as ImagePayload['mimeType'],
        data,
      });
      setImagePreview(dataUrl);
      setError('');
    } catch {
      setError(labels.readError);
    } finally {
      event.target.value = '';
    }
  }

  async function chooseDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError(labels.fileTooLarge);
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      setInput(text.slice(0, 30000));
      setError('');
    } catch {
      setError(labels.readError);
    } finally {
      event.target.value = '';
    }
  }

  async function copyOutput() {
    if (!out) return;

    await navigator.clipboard.writeText(out);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadOutput() {
    if (!out) return;

    const blob = new Blob([out], {
      type: 'text/plain;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${slug}-result.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="grid gap-5 xl:grid-cols-2"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
            <Sparkles size={18} />
          </span>

          <div className="min-w-0">
            <h2 className="font-black">{labels.input}</h2>
            <p className="muted mt-1 text-sm leading-6">
              {description}
            </p>
          </div>
        </div>

        {isImage ? (
          <div className="mt-5">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm font-bold transition hover:bg-black/[.025] dark:hover:bg-white/[.04]">
              <ImageIcon size={18} />
              {labels.chooseImage}
              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseImage}
              />
            </label>

            <p className="muted mt-2 text-xs">{labels.imageHint}</p>

            {imagePreview ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-black/[.03]">
                <img
                  src={imagePreview}
                  alt="Selected image preview"
                  className="max-h-72 w-full object-contain"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {isDocument ? (
          <div className="mt-5">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm font-bold transition hover:bg-black/[.025] dark:hover:bg-white/[.04]">
              <Upload size={18} />
              {labels.chooseDocument}
              <input
                className="hidden"
                type="file"
                accept=".txt,.md,.csv,.json,.html,.xml,.js,.jsx,.ts,.tsx,.css,.py,.java,.c,.cpp,.sql,.log,text/*,application/json"
                onChange={chooseDocument}
              />
            </label>

            <p className="muted mt-2 text-xs leading-5">
              {labels.documentHint}
            </p>
          </div>
        ) : null}

        <Textarea
          className="mt-5 min-h-64 resize-y"
          placeholder={
            isImage ? labels.imagePlaceholder : labels.placeholder
          }
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={30000}
        />

        <div className="muted mt-2 text-end text-xs">
          {input.length.toLocaleString()} / 30,000
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={clearAll}>
            <RotateCcw size={16} />
            {labels.clear}
          </Button>

          <Button
            disabled={
              busy ||
              (isImage ? !image : !input.trim())
            }
            onClick={run}
          >
            <Send size={16} />
            {busy ? labels.generating : labels.generate}
          </Button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black">{labels.output}</h2>
            <p className="muted mt-1 text-xs">{labels.routed}</p>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              disabled={!out}
              onClick={copyOutput}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="hidden sm:inline">
                {copied ? labels.copied : labels.copy}
              </span>
            </Button>

            <Button
              variant="ghost"
              disabled={!out}
              onClick={downloadOutput}
            >
              <Download size={16} />
              <span className="hidden sm:inline">
                {labels.download}
              </span>
            </Button>
          </div>
        </div>

        {fallbackUsed || cached ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {fallbackUsed ? (
              <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                {labels.fallback}
              </span>
            ) : null}

            {cached ? (
              <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                {labels.cache}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 min-h-64 whitespace-pre-wrap rounded-2xl border border-[var(--line)] p-5 text-sm leading-7">
          {out ? (
            out
          ) : (
            <div className="muted flex min-h-52 flex-col items-center justify-center text-center">
              <FileText size={28} />
              <span className="mt-3">{labels.resultPlaceholder}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

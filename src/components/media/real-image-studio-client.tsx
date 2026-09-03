'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';

import type { AppLocale } from '@/lib/i18n';
import { getCsrfToken, runTextAI } from '@/lib/client/media-api';

type ProjectOption = { id: string; name: string };
type Mode = 'fast' | 'balanced' | 'quality';
type Generated = {
  jobId: string;
  model: string;
  cost: number | null;
  url: string;
  mediaType: string;
  fileName: string;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      resolve(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

function filenameFromDisposition(value: string | null, fallback: string) {
  const match = value?.match(/filename="([^"]+)"/i);
  return match?.[1] || fallback;
}

export function RealImageStudioClient({
  locale,
  projects,
}: {
  locale: AppLocale;
  projects: ProjectOption[];
}) {
  const ar = locale === 'ar';
  const [title, setTitle] = useState(ar ? 'صورة جديدة' : 'New image');
  const [projectId, setProjectId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [resolution, setResolution] = useState<'512' | '1K' | '2K' | '4K'>('1K');
  const [quality, setQuality] = useState<'auto' | 'low' | 'medium' | 'high'>('auto');
  const [mode, setMode] = useState<Mode>('balanced');
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('webp');
  const [reference, setReference] = useState<{ file: File; url: string } | null>(null);
  const [confirmSpend, setConfirmSpend] = useState(false);
  const [busy, setBusy] = useState<'enhance' | 'generate' | ''>('');
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<Generated | null>(null);

  const t = useMemo(
    () =>
      ar
        ? {
            title: 'استوديو الصور',
            description:
              'أنشئ صورة حقيقية أو استخدم صورة مرجعية للتعديل والتحويل. النتيجة تأتي من مزود توليد الصور الفعلي.',
            prompt: 'صف الصورة التي تريدها',
            placeholder:
              'مثال: إعلان فاخر لعطر عربي على رخام أسود، إضاءة سينمائية، تفاصيل واقعية…',
            enhance: 'تحسين الوصف',
            enhancing: 'جاري التحسين…',
            project: 'المشروع',
            noProject: 'بدون مشروع',
            imageTitle: 'اسم المهمة',
            ratio: 'النسبة',
            resolution: 'الدقة',
            quality: 'الجودة',
            format: 'الصيغة',
            mode: 'وضع التوليد',
            fast: 'سريع',
            balanced: 'متوازن',
            qualityMode: 'أعلى جودة',
            auto: 'تلقائي',
            low: 'منخفضة',
            medium: 'متوسطة',
            high: 'عالية',
            reference: 'صورة مرجعية / تعديل صورة',
            addReference: 'إضافة صورة مرجعية',
            referenceHint:
              'JPG / PNG / WEBP حتى 2.5 MB. الصورة تُرسل للمزود فقط لتنفيذ طلبك.',
            tooLarge: 'الصورة المرجعية أكبر من 2.5 MB.',
            badType: 'استخدم JPG أو PNG أو WEBP فقط.',
            spend: 'أفهم أن إنشاء الصورة قد يستهلك رصيد OpenRouter الحقيقي.',
            generate: 'إنشاء الصورة الآن',
            generating: 'جاري إنشاء الصورة الحقيقية…',
            result: 'النتيجة',
            download: 'تنزيل الصورة',
            regenerate: 'إعادة الإنشاء',
            provider: 'النموذج',
            cost: 'تكلفة المزود',
            transient:
              'النتيجة متاحة للتنزيل في هذه الجلسة. الحفظ الدائم في مكتبة الوسائط يحتاج تخزين ملفات سحابي وسيتم ربطه في مرحلة التخزين.',
            safe: 'لن تُعرض نتيجة وهمية: إما صورة فعلية من المزود أو رسالة خطأ واضحة.',
            missing: 'اكتب وصفًا للصورة ووافق على استخدام الرصيد أولًا.',
            failed: 'تعذر إنشاء الصورة الآن.',
          }
        : {
            title: 'Image Studio',
            description:
              'Generate a real image or use a reference image for transformation. Output comes from the actual image provider.',
            prompt: 'Describe the image you want',
            placeholder:
              'Example: a premium Arabic perfume ad on black marble, cinematic lighting, photorealistic detail…',
            enhance: 'Enhance prompt',
            enhancing: 'Enhancing…',
            project: 'Project',
            noProject: 'No project',
            imageTitle: 'Job name',
            ratio: 'Aspect ratio',
            resolution: 'Resolution',
            quality: 'Quality',
            format: 'Format',
            mode: 'Generation mode',
            fast: 'Fast',
            balanced: 'Balanced',
            qualityMode: 'Best quality',
            auto: 'Auto',
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            reference: 'Reference / image edit',
            addReference: 'Add reference image',
            referenceHint:
              'JPG / PNG / WEBP up to 2.5 MB. The image is sent only to the provider for this request.',
            tooLarge: 'Reference image is larger than 2.5 MB.',
            badType: 'Use JPG, PNG, or WEBP only.',
            spend: 'I understand image generation may spend real OpenRouter credits.',
            generate: 'Generate image now',
            generating: 'Generating real image…',
            result: 'Result',
            download: 'Download image',
            regenerate: 'Regenerate',
            provider: 'Model',
            cost: 'Provider cost',
            transient:
              'The output can be downloaded in this session. Permanent media-library storage requires cloud file storage and will be connected in the storage phase.',
            safe: 'No fake output: Nexa shows either a real provider image or a clear error.',
            missing: 'Enter a prompt and confirm credit usage first.',
            failed: 'Image generation failed.',
          },
    [ar],
  );

  useEffect(() => {
    return () => {
      if (reference?.url) URL.revokeObjectURL(reference.url);
    };
  }, [reference?.url]);

  useEffect(() => {
    return () => {
      if (generated?.url) URL.revokeObjectURL(generated.url);
    };
  }, [generated?.url]);

  function chooseReference(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t.badType);
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setError(t.tooLarge);
      return;
    }
    if (reference?.url) URL.revokeObjectURL(reference.url);
    setReference({ file, url: URL.createObjectURL(file) });
    setError('');
  }

  async function enhance() {
    if (!prompt.trim() || busy) return;
    setBusy('enhance');
    setError('');

    try {
      const output = await runTextAI(
        'writer',
        ar
          ? `حسّن الوصف التالي ليكون برومبت احترافي لتوليد صورة. حافظ على الفكرة الأساسية ولا تضف أسماء علامات أو أشخاص غير مذكورين. أعد البرومبت فقط بدون شرح:\n\n${prompt}`
          : `Improve the following into a professional image-generation prompt. Preserve the core idea and do not invent brands or people. Return only the prompt:\n\n${prompt}`,
      );
      setPrompt(output.trim());
    } catch {
      setError(t.failed);
    } finally {
      setBusy('');
    }
  }

  async function generate() {
    if (!prompt.trim() || !confirmSpend || busy) {
      setError(t.missing);
      return;
    }

    setBusy('generate');
    setError('');

    try {
      const token = await getCsrfToken();
      const referencePayload = reference
        ? {
            mimeType: reference.file.type as 'image/jpeg' | 'image/png' | 'image/webp',
            data: await fileToBase64(reference.file),
          }
        : undefined;

      const response = await fetch('/api/media/generate/image', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          title,
          projectId: projectId || null,
          prompt,
          aspectRatio: ratio,
          resolution,
          quality,
          mode,
          outputFormat: format,
          reference: referencePayload,
          confirmSpend: true,
        }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const body = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : null;
        throw new Error(body?.error || t.failed);
      }

      if (!contentType.startsWith('image/')) throw new Error(t.failed);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const model = response.headers.get('x-nexa-image-model') ?? 'OpenRouter';
      const costText = response.headers.get('x-nexa-image-cost');
      const cost = costText && Number.isFinite(Number(costText)) ? Number(costText) : null;
      const jobId = response.headers.get('x-nexa-image-job') ?? `image-${Date.now()}`;
      const extension = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
      const fileName = filenameFromDisposition(
        response.headers.get('content-disposition'),
        `nexa-image.${extension}`,
      );

      setGenerated((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return {
          jobId,
          model,
          cost,
          url,
          mediaType: contentType,
          fileName,
        };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.failed);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-6xl" dir={ar ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="brand-gradient grid size-11 place-items-center rounded-2xl text-white">
            <ImageIcon size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">{t.title}</h1>
            <p className="muted mt-1 text-sm">{t.description}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.92fr_1.08fr]">
        <section className="space-y-4">
          <div className="surface rounded-3xl p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold sm:col-span-2">
                {t.imageTitle}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none"
                />
              </label>
              <label className="text-sm font-bold">
                {t.project}
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
                >
                  <option value="">{t.noProject}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                {t.mode}
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as Mode)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
                >
                  <option value="fast">{t.fast}</option>
                  <option value="balanced">{t.balanced}</option>
                  <option value="quality">{t.qualityMode}</option>
                </select>
              </label>
            </div>
          </div>

          <div className="surface rounded-3xl p-5">
            <label className="text-sm font-black">{t.prompt}</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t.placeholder}
              rows={7}
              className="mt-2 w-full resize-none rounded-2xl border border-[var(--line)] bg-transparent p-4 text-start leading-7 outline-none focus:border-[var(--brand)]"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={!prompt.trim() || Boolean(busy)}
                onClick={() => void enhance()}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--brand)] disabled:opacity-50"
              >
                {busy === 'enhance' ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <WandSparkles size={16} />
                )}
                {busy === 'enhance' ? t.enhancing : t.enhance}
              </button>
            </div>
          </div>

          <div className="surface rounded-3xl p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-bold">
                {t.ratio}
                <select
                  value={ratio}
                  onChange={(event) => setRatio(event.target.value as typeof ratio)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
                >
                  {['1:1', '16:9', '9:16', '4:3', '3:4'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                {t.resolution}
                <select
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value as typeof resolution)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
                >
                  {['512', '1K', '2K', '4K'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                {t.quality}
                <select
                  value={quality}
                  onChange={(event) => setQuality(event.target.value as typeof quality)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
                >
                  <option value="auto">{t.auto}</option>
                  <option value="low">{t.low}</option>
                  <option value="medium">{t.medium}</option>
                  <option value="high">{t.high}</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                {t.format}
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as typeof format)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
                >
                  <option>webp</option>
                  <option>png</option>
                  <option>jpeg</option>
                </select>
              </label>
            </div>
          </div>

          <div className="surface rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <b>{t.reference}</b>
                <p className="muted mt-1 text-xs leading-5">{t.referenceHint}</p>
              </div>
              {reference ? (
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(reference.url);
                    setReference(null);
                  }}
                  className="grid size-9 place-items-center rounded-xl border border-[var(--line)]"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            {reference ? (
              <img
                src={reference.url}
                alt=""
                className="mt-4 max-h-56 w-full rounded-2xl object-contain"
              />
            ) : (
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] p-6 text-sm font-bold">
                <Upload size={18} /> {t.addReference}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => chooseReference(event.target.files?.[0])}
                />
              </label>
            )}
          </div>

          <label className="surface flex cursor-pointer items-start gap-3 rounded-2xl p-4 text-sm leading-6">
            <input
              type="checkbox"
              checked={confirmSpend}
              onChange={(event) => setConfirmSpend(event.target.checked)}
              className="mt-1"
            />
            <span>{t.spend}</span>
          </label>

          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy === 'generate'}
            className="brand-gradient flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-black text-white disabled:opacity-50"
          >
            {busy === 'generate' ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <Sparkles size={19} />
            )}
            {busy === 'generate' ? t.generating : t.generate}
          </button>

          {error ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}
        </section>

        <section className="surface min-h-[640px] rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black">{t.result}</h2>
            {generated ? (
              <button
                type="button"
                onClick={() => void generate()}
                disabled={Boolean(busy)}
                className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-bold"
              >
                <RefreshCw size={14} />
                {t.regenerate}
              </button>
            ) : null}
          </div>

          {generated ? (
            <div className="mt-5 space-y-5">
              <img
                src={generated.url}
                alt="Generated by Nexa AI"
                className="max-h-[620px] w-full rounded-2xl bg-black/5 object-contain"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="muted text-xs">
                  <span>
                    {t.provider}: <span dir="ltr">{generated.model}</span>
                  </span>
                  {typeof generated.cost === 'number' ? (
                    <span> · {t.cost}: ${generated.cost.toFixed(4)}</span>
                  ) : null}
                </div>
                <a
                  href={generated.url}
                  download={generated.fileName}
                  className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-black text-white"
                >
                  <Download size={16} />
                  {t.download}
                </a>
              </div>
              <p className="muted text-xs leading-5">{t.transient}</p>
            </div>
          ) : (
            <div className="muted grid min-h-[520px] place-items-center text-center">
              <div>
                {busy === 'generate' ? (
                  <LoaderCircle size={38} className="mx-auto animate-spin text-[var(--brand)]" />
                ) : (
                  <ImageIcon size={42} className="mx-auto opacity-40" />
                )}
                <p className="mt-4 max-w-sm text-sm leading-6">
                  {busy === 'generate' ? t.generating : t.safe}
                </p>
              </div>
            </div>
          )}

          <div className="muted mt-5 flex items-start gap-2 border-t border-[var(--line)] pt-4 text-xs leading-5">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" />
            <span>{t.safe}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

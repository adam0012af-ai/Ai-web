'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, Sparkles, WandSparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { AppLocale } from '@/lib/i18n';
import { getMediaMessages } from '@/lib/media-messages';
import {
  dimensionsFromRatio,
  imageRatios,
  imageSizes,
  imageStyles,
  localizedPreset,
  mediaQualities,
} from '@/data/media-presets';
import { createMediaJob, runTextAI } from '@/lib/client/media-api';

type ProjectOption = { id: string; name: string };

export function ImageStudioClient({
  locale,
  projects,
}: {
  locale: AppLocale;
  projects: ProjectOption[];
}) {
  const t = getMediaMessages(locale);
  const ar = locale === 'ar';

  const [operation, setOperation] = useState<
    'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'EDIT_IMAGE'
  >('TEXT_TO_IMAGE');
  const [title, setTitle] = useState(ar ? 'صورة جديدة' : 'New image');
  const [projectId, setProjectId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [ratio, setRatio] = useState<(typeof imageRatios)[number]>('1:1');
  const [size, setSize] = useState('2048');
  const [count, setCount] = useState(1);
  const [quality, setQuality] = useState('high');
  const [style, setStyle] = useState('photorealistic');
  const [reference, setReference] = useState<{
    file: File;
    url: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [busy, setBusy] = useState<'enhance' | 'save' | ''>('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    return () => {
      if (reference?.url) URL.revokeObjectURL(reference.url);
    };
  }, [reference?.url]);

  const dimensions = useMemo(() => {
    const selected = imageSizes.find((item) => item.id === size) ?? imageSizes[2];
    return dimensionsFromRatio(selected.shortSide, ratio);
  }, [size, ratio]);

  async function chooseReference(file: File | undefined) {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setMessage(t.common.fileTooLarge);
      return;
    }

    if (reference?.url) URL.revokeObjectURL(reference.url);

    const url = URL.createObjectURL(file);
    const next: {
      file: File;
      url: string;
      width?: number;
      height?: number;
    } = { file, url };

    const image = new Image();
    image.src = url;

    await new Promise<void>((resolve) => {
      image.onload = () => {
        next.width = image.naturalWidth;
        next.height = image.naturalHeight;
        resolve();
      };
      image.onerror = () => resolve();
    });

    setReference(next);
  }

  async function enhance() {
    if (!prompt.trim() || busy) return;

    setBusy('enhance');
    setMessage('');

    try {
      const text = await runTextAI(
        'writer',
        ar
          ? `حوّل الوصف التالي إلى برومبت احترافي لتوليد صورة. حافظ على الفكرة، وأضف فقط تفاصيل مفيدة عن الإضاءة والتكوين والعدسة والخامات والبيئة. أعد البرومبت فقط بدون شرح:\n\n${prompt}`
          : `Turn this into a professional image-generation prompt. Preserve the concept and add only useful lighting, composition, lens, material, and environment detail. Return only the improved prompt:\n\n${prompt}`,
      );
      setPrompt(text.trim());
    } catch {
      setMessage(t.common.failed);
    } finally {
      setBusy('');
    }
  }

  async function saveDraft() {
    if (!prompt.trim() || busy) return;

    if (operation !== 'TEXT_TO_IMAGE' && !reference) {
      setMessage(t.image.referenceRequired);
      return;
    }

    setBusy('save');
    setMessage('');

    try {
      await createMediaJob({
        kind: 'IMAGE',
        operation,
        title: title.trim() || (ar ? 'صورة جديدة' : 'New image'),
        prompt,
        negativePrompt,
        projectId: projectId || null,
        settings: {
          ratio,
          size,
          dimensions,
          count,
          quality,
          style,
          reference: reference
            ? {
                name: reference.file.name,
                type: reference.file.type,
                size: reference.file.size,
                width: reference.width,
                height: reference.height,
                localOnly: true,
              }
            : null,
        },
      });

      setMessage(`${t.common.saved} ${t.common.providerWait}`);
    } catch {
      setMessage(t.common.failed);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]" dir={ar ? 'rtl' : 'ltr'}>
      <div className="space-y-5">
        <div className="surface rounded-2xl p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              {t.common.operation}
              <select
                value={operation}
                onChange={(event) =>
                  setOperation(
                    event.target.value as
                      | 'TEXT_TO_IMAGE'
                      | 'IMAGE_TO_IMAGE'
                      | 'EDIT_IMAGE',
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                <option value="TEXT_TO_IMAGE">{t.image.textToImage}</option>
                <option value="IMAGE_TO_IMAGE">{t.image.imageToImage}</option>
                <option value="EDIT_IMAGE">{t.image.editImage}</option>
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.common.project}
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                <option value="">{t.common.noProject}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold sm:col-span-2">
              {t.common.title}
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3"
              />
            </label>
          </div>
        </div>

        {operation !== 'TEXT_TO_IMAGE' ? (
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <b>{t.image.reference}</b>
              {reference ? (
                <button
                  onClick={() => {
                    URL.revokeObjectURL(reference.url);
                    setReference(null);
                  }}
                  className="muted grid size-8 place-items-center rounded-lg"
                  aria-label={t.common.removeFile}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>

            {reference ? (
              <div className="mt-3">
                <img
                  src={reference.url}
                  alt=""
                  className="max-h-80 w-full rounded-xl object-contain"
                />
                <div className="muted mt-2 text-xs">
                  {reference.file.name}
                  {reference.width && reference.height
                    ? ` · ${reference.width}×${reference.height}`
                    : ''}
                </div>
              </div>
            ) : (
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] p-6 text-sm">
                <ImageIcon size={18} />
                {t.common.selectFile}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void chooseReference(event.target.files?.[0])}
                />
              </label>
            )}

            <p className="muted mt-2 text-xs">{t.common.localOnly}</p>
          </div>
        ) : null}

        <div className="surface rounded-2xl p-5">
          <label className="text-sm font-bold">
            {t.common.prompt}
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={6}
              maxLength={12000}
              placeholder={t.image.promptPlaceholder}
              className="mt-2"
            />
          </label>

          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              disabled={!prompt.trim() || Boolean(busy)}
              onClick={() => void enhance()}
            >
              <WandSparkles size={16} />
              {busy === 'enhance' ? t.common.enhancing : t.common.enhancePrompt}
            </Button>
          </div>

          <label className="mt-4 block text-sm font-bold">
            {t.common.negativePrompt}
            <Textarea
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              rows={3}
              maxLength={5000}
              className="mt-2"
            />
          </label>
        </div>

        <div className="surface rounded-2xl p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              {t.image.aspectRatio}
              <select
                value={ratio}
                onChange={(event) =>
                  setRatio(event.target.value as (typeof imageRatios)[number])
                }
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {imageRatios.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.image.size}
              <select
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {imageSizes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.image.count}
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {[1, 2, 3, 4].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.image.generationQuality}
              <select
                value={quality}
                onChange={(event) => setQuality(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {mediaQualities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {localizedPreset(item, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold sm:col-span-2">
              {t.common.style}
              <select
                value={style}
                onChange={(event) => setStyle(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {imageStyles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {localizedPreset(item, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-[var(--line)] p-3 text-sm">{message}</div>
        ) : null}

        <Button
          disabled={!prompt.trim() || Boolean(busy)}
          onClick={() => void saveDraft()}
        >
          <Sparkles size={16} />
          {busy === 'save' ? t.common.saving : t.common.saveDraft}
        </Button>
      </div>

      <div className="space-y-5">
        <div className="surface sticky top-24 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-[var(--brand)]" />
            <b>{t.common.dimensions}</b>
          </div>

          <div
            className="mx-auto mt-5 grid max-w-sm place-items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-black/[.03] dark:bg-white/[.03]"
            style={{
              aspectRatio: `${dimensions.width}/${dimensions.height}`,
              maxHeight: 380,
            }}
          >
            {reference ? (
              <img
                src={reference.url}
                alt=""
                className="size-full object-cover opacity-80"
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="mx-auto muted" size={32} />
                <div className="muted mt-2 text-xs">
                  {dimensions.width} × {dimensions.height}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[var(--line)] p-3">
              <div className="muted text-xs">{t.image.aspectRatio}</div>
              <b>{ratio}</b>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-3">
              <div className="muted text-xs">{t.image.count}</div>
              <b>{count}</b>
            </div>
          </div>

          <Link
            href="/dashboard/ai/image"
            className="mt-4 block rounded-xl border border-[var(--line)] px-3 py-2 text-center text-sm font-bold text-[var(--brand)]"
          >
            {t.image.analyzer}
          </Link>

          <p className="muted mt-4 text-xs leading-5">{t.common.providerWait}</p>
        </div>
      </div>
    </div>
  );
}

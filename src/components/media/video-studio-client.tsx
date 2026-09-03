'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, FileVideo, Sparkles, WandSparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { AppLocale } from '@/lib/i18n';
import { getMediaMessages } from '@/lib/media-messages';
import {
  cameraMoves,
  dimensionsFromRatio,
  localizedPreset,
  mediaQualities,
  sceneCounts,
  videoDurations,
  videoFps,
  videoRatios,
  videoResolutionPresets,
  videoStyles,
} from '@/data/media-presets';
import { createMediaJob, runTextAI } from '@/lib/client/media-api';
import { MarkdownMessage } from '@/components/ai/markdown-message';

type ProjectOption = { id: string; name: string };

export function VideoStudioClient({
  locale,
  projects,
}: {
  locale: AppLocale;
  projects: ProjectOption[];
}) {
  const t = getMediaMessages(locale);
  const ar = locale === 'ar';

  const [operation, setOperation] = useState<
    'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO' | 'VIDEO_TO_VIDEO'
  >('TEXT_TO_VIDEO');
  const [title, setTitle] = useState(ar ? 'فيديو جديد' : 'New video');
  const [projectId, setProjectId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [ratio, setRatio] = useState<(typeof videoRatios)[number]>('16:9');
  const [resolution, setResolution] = useState('1080');
  const [fps, setFps] = useState(30);
  const [duration, setDuration] = useState(10);
  const [scenes, setScenes] = useState(3);
  const [quality, setQuality] = useState('high');
  const [style, setStyle] = useState('cinematic');
  const [camera, setCamera] = useState('dolly_in');
  const [motion, setMotion] = useState(45);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [exports, setExports] = useState<string[]>(['youtube', 'reels']);
  const [source, setSource] = useState<{
    file: File;
    url: string;
    width?: number;
    height?: number;
    duration?: number;
  } | null>(null);
  const [storyboard, setStoryboard] = useState('');
  const [busy, setBusy] = useState<'enhance' | 'storyboard' | 'save' | ''>('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    return () => {
      if (source?.url) URL.revokeObjectURL(source.url);
    };
  }, [source?.url]);

  const dimensions = useMemo(() => {
    const selected =
      videoResolutionPresets.find((item) => item.id === resolution) ??
      videoResolutionPresets[3];

    return dimensionsFromRatio(
      selected.shortSide,
      ratio,
      customWidth,
      customHeight,
    );
  }, [resolution, ratio, customWidth, customHeight]);

  function toggleExport(id: string) {
    setExports((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function chooseSource(file: File | undefined) {
    if (!file) return;

    const maxBytes = file.type.startsWith('image/') ? 25 * 1024 * 1024 : 250 * 1024 * 1024;
    if (file.size > maxBytes) {
      setMessage(t.common.fileTooLarge);
      return;
    }

    if (source?.url) URL.revokeObjectURL(source.url);

    const url = URL.createObjectURL(file);
    const next: {
      file: File;
      url: string;
      width?: number;
      height?: number;
      duration?: number;
    } = { file, url };

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          next.width = video.videoWidth;
          next.height = video.videoHeight;
          next.duration = video.duration;
          resolve();
        };
        video.onerror = () => resolve();
      });
    } else if (file.type.startsWith('image/')) {
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
    }

    setSource(next);
  }

  async function enhance() {
    if (!prompt.trim() || busy) return;

    setBusy('enhance');
    setMessage('');

    try {
      const text = await runTextAI(
        'writer',
        ar
          ? `حوّل الوصف التالي إلى برومبت فيديو سينمائي احترافي ودقيق. حافظ على الفكرة، وأضف فقط تفاصيل مفيدة عن المشهد والإضاءة والتكوين وحركة الكاميرا والحركة. أعد البرومبت فقط بدون شرح:\n\n${prompt}`
          : `Turn this into a precise professional video-generation prompt. Preserve the concept and add only useful scene, lighting, composition, camera, and motion detail. Return only the improved prompt:\n\n${prompt}`,
      );

      setPrompt(text.trim());
    } catch {
      setMessage(t.common.failed);
    } finally {
      setBusy('');
    }
  }

  async function makeStoryboard() {
    if (!prompt.trim() || busy) return;

    setBusy('storyboard');
    setMessage('');

    try {
      const text = await runTextAI(
        'brainstorm',
        ar
          ? `قسّم فكرة الفيديو التالية إلى ${scenes} مشاهد مترابطة. لكل مشهد اكتب: المدة التقريبية، وصف اللقطة، حركة الكاميرا، حركة العناصر، والانتقال للمشهد التالي. إجمالي الفيديو ${duration} ثانية، النسبة ${ratio}، الأسلوب ${style}. لا تخترع منتجًا أو شخصية غير مذكورة.\n\nالفكرة:\n${prompt}`
          : `Split this video concept into ${scenes} coherent scenes. For each scene include approximate duration, shot description, camera movement, subject motion, and transition. Total duration ${duration}s, ratio ${ratio}, style ${style}. Do not invent products or characters not mentioned.\n\nConcept:\n${prompt}`,
      );

      setStoryboard(text);
    } catch {
      setMessage(t.common.failed);
    } finally {
      setBusy('');
    }
  }

  async function saveDraft() {
    if (!prompt.trim() || busy) return;

    if (operation !== 'TEXT_TO_VIDEO' && !source) {
      setMessage(t.video.sourceRequired);
      return;
    }

    setBusy('save');
    setMessage('');

    try {
      await createMediaJob({
        kind: 'VIDEO',
        operation,
        title: title.trim() || (ar ? 'فيديو جديد' : 'New video'),
        prompt,
        negativePrompt,
        projectId: projectId || null,
        settings: {
          ratio,
          resolution,
          dimensions,
          fps,
          duration,
          scenes,
          quality,
          style,
          camera,
          motion,
          exports,
          storyboard,
          source: source
            ? {
                name: source.file.name,
                type: source.file.type,
                size: source.file.size,
                width: source.width,
                height: source.height,
                duration: source.duration,
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

  const exportLabels = {
    youtube: t.video.youtube,
    reels: t.video.reels,
    square: t.video.square,
    feed: t.video.feed,
  };

  return (
    <div
      className="grid gap-6 xl:grid-cols-[1.08fr_.92fr]"
      dir={ar ? 'rtl' : 'ltr'}
    >
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
                      | 'TEXT_TO_VIDEO'
                      | 'IMAGE_TO_VIDEO'
                      | 'VIDEO_TO_VIDEO',
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                <option value="TEXT_TO_VIDEO">{t.video.textToVideo}</option>
                <option value="IMAGE_TO_VIDEO">{t.video.imageToVideo}</option>
                <option value="VIDEO_TO_VIDEO">{t.video.videoToVideo}</option>
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
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none"
              />
            </label>
          </div>
        </div>

        {operation !== 'TEXT_TO_VIDEO' ? (
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <b>{t.video.source}</b>
              {source ? (
                <button
                  onClick={() => {
                    URL.revokeObjectURL(source.url);
                    setSource(null);
                  }}
                  className="muted grid size-8 place-items-center rounded-lg"
                  aria-label={t.common.removeFile}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>

            {source ? (
              <div className="mt-3">
                {source.file.type.startsWith('video/') ? (
                  <video
                    src={source.url}
                    controls
                    className="max-h-72 w-full rounded-xl bg-black object-contain"
                  />
                ) : (
                  <img
                    src={source.url}
                    alt=""
                    className="max-h-72 w-full rounded-xl object-contain"
                  />
                )}
                <div className="muted mt-2 text-xs">
                  {source.file.name}
                  {source.width && source.height
                    ? ` · ${source.width}×${source.height}`
                    : ''}
                  {source.duration ? ` · ${source.duration.toFixed(1)}s` : ''}
                </div>
              </div>
            ) : (
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] p-6 text-sm">
                <FileVideo size={18} />
                {t.common.selectFile}
                <input
                  type="file"
                  accept={operation === 'IMAGE_TO_VIDEO' ? 'image/*' : 'video/*'}
                  className="hidden"
                  onChange={(event) => void chooseSource(event.target.files?.[0])}
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
              placeholder={t.video.promptPlaceholder}
              className="mt-2"
            />
          </label>

          <div className="mt-2 flex justify-end">
            <Button
              type="button"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-bold">
              {t.video.aspectRatio}
              <select
                value={ratio}
                onChange={(event) =>
                  setRatio(event.target.value as (typeof videoRatios)[number])
                }
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {videoRatios.map((item) => (
                  <option key={item} value={item}>
                    {item === 'custom' ? t.video.custom : item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.video.resolution}
              <select
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {videoResolutionPresets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.video.fps}
              <select
                value={fps}
                onChange={(event) => setFps(Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {videoFps.map((item) => (
                  <option key={item} value={item}>
                    {item} FPS
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.video.duration}
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {videoDurations.map((item) => (
                  <option key={item} value={item}>
                    {item} {t.video.seconds}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.video.scenes}
              <select
                value={scenes}
                onChange={(event) => setScenes(Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {sceneCounts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.video.generationQuality}
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

            <label className="text-sm font-bold">
              {t.common.style}
              <select
                value={style}
                onChange={(event) => setStyle(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {videoStyles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {localizedPreset(item, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.video.camera}
              <select
                value={camera}
                onChange={(event) => setCamera(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
              >
                {cameraMoves.map((item) => (
                  <option key={item.id} value={item.id}>
                    {localizedPreset(item, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              {t.video.motion}: {motion}%
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={motion}
                onChange={(event) => setMotion(Number(event.target.value))}
                className="mt-4 w-full"
              />
            </label>
          </div>

          {ratio === 'custom' ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                {t.video.customWidth}
                <input
                  type="number"
                  min={128}
                  max={7680}
                  value={customWidth}
                  onChange={(event) => setCustomWidth(Number(event.target.value))}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3"
                />
              </label>
              <label className="text-sm font-bold">
                {t.video.customHeight}
                <input
                  type="number"
                  min={128}
                  max={7680}
                  value={customHeight}
                  onChange={(event) => setCustomHeight(Number(event.target.value))}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3"
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="surface rounded-2xl p-5">
          <b>{t.video.batchExports}</b>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(exportLabels).map(([id, label]) => (
              <label
                key={id}
                className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={exports.includes(id)}
                  onChange={() => toggleExport(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-[var(--line)] p-3 text-sm">{message}</div>
        ) : null}

        <Button
          className="w-full sm:w-auto"
          disabled={!prompt.trim() || Boolean(busy)}
          onClick={() => void saveDraft()}
        >
          <Clapperboard size={16} />
          {busy === 'save' ? t.common.saving : t.common.saveDraft}
        </Button>
      </div>

      <div className="space-y-5">
        <div className="surface sticky top-24 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-[var(--brand)]" />
            <b>{t.video.previewConfig}</b>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[var(--line)] p-3">
              <div className="muted text-xs">{t.common.dimensions}</div>
              <b>{dimensions.width} × {dimensions.height}</b>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-3">
              <div className="muted text-xs">{t.video.fps}</div>
              <b>{fps} FPS</b>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-3">
              <div className="muted text-xs">{t.video.duration}</div>
              <b>{duration} {t.video.seconds}</b>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-3">
              <div className="muted text-xs">{t.video.scenes}</div>
              <b>{scenes}</b>
            </div>
          </div>

          <Button
            variant="secondary"
            className="mt-4 w-full"
            disabled={!prompt.trim() || Boolean(busy)}
            onClick={() => void makeStoryboard()}
          >
            <Sparkles size={16} />
            {busy === 'storyboard'
              ? t.video.generatingStoryboard
              : t.video.generateStoryboard}
          </Button>

          <div className="mt-4 rounded-xl border border-[var(--line)] p-4">
            <b className="text-sm">{t.video.storyboard}</b>
            <div className="mt-3">
              {storyboard ? (
                <MarkdownMessage content={storyboard} />
              ) : (
                <p className="muted text-sm">{t.video.storyboardEmpty}</p>
              )}
            </div>
          </div>

          <p className="muted mt-4 text-xs leading-5">{t.common.providerWait}</p>
        </div>
      </div>
    </div>
  );
}

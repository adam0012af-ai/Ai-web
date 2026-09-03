'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clapperboard,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';

import type { AppLocale } from '@/lib/i18n';
import { getCsrfToken, runTextAI } from '@/lib/client/media-api';

type ProjectOption = { id: string; name: string };
type Mode = 'fast' | 'balanced' | 'quality';
type Status = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;

type VideoState = {
  jobId: string;
  status: Status;
  progress?: number;
  model?: string | null;
  externalStatus?: string;
  cost?: number | null;
  error?: string | null;
  contentUrl?: string | null;
};

const ACTIVE_JOB_KEY = 'nexa-v6-active-video-job';

export function RealVideoStudioClient({
  locale,
  projects,
}: {
  locale: AppLocale;
  projects: ProjectOption[];
}) {
  const ar = locale === 'ar';
  const [title, setTitle] = useState(ar ? 'فيديو جديد' : 'New video');
  const [projectId, setProjectId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<4 | 6 | 8>(4);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [ratio, setRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generateAudio, setGenerateAudio] = useState(false);
  const [mode, setMode] = useState<Mode>('fast');
  const [confirmSpend, setConfirmSpend] = useState(false);
  const [busy, setBusy] = useState<'enhance' | 'submit' | 'poll' | ''>('');
  const [error, setError] = useState('');
  const [video, setVideo] = useState<VideoState | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = useMemo(
    () =>
      ar
        ? {
            title: 'استوديو الفيديو',
            description: 'حوّل الوصف إلى فيديو حقيقي عبر مهمة إنتاج فعلية، وتابع حالتها حتى يجهز الملف للتشغيل والتنزيل.',
            jobTitle: 'اسم المهمة',
            project: 'المشروع',
            noProject: 'بدون مشروع',
            prompt: 'وصف الفيديو',
            placeholder: 'مثال: لقطة سينمائية لسيارة كهربائية سوداء تمر في مدينة مستقبلية ليلًا، انعكاسات نيون، حركة كاميرا بطيئة…',
            enhance: 'تحسين الوصف',
            enhancing: 'جاري التحسين…',
            duration: 'المدة',
            resolution: 'الدقة',
            ratio: 'النسبة',
            audio: 'توليد صوت مع الفيديو عندما يدعم النموذج',
            mode: 'وضع التوليد',
            fast: 'سريع',
            balanced: 'متوازن',
            quality: 'أعلى جودة',
            spend: 'أفهم أن إنشاء الفيديو مهمة مدفوعة وقد تستهلك رصيد OpenRouter الحقيقي.',
            submit: 'ابدأ إنشاء الفيديو الحقيقي',
            submitting: 'جاري إرسال مهمة الفيديو…',
            status: 'حالة الإنتاج',
            queued: 'في قائمة الانتظار',
            processing: 'جاري إنشاء الفيديو',
            completed: 'اكتمل الفيديو',
            failed: 'فشل إنشاء الفيديو',
            refreshing: 'جاري تحديث الحالة…',
            refresh: 'تحديث الحالة',
            model: 'النموذج',
            cost: 'تكلفة المزود',
            play: 'الفيديو جاهز للتشغيل',
            download: 'تنزيل MP4',
            missing: 'اكتب وصف الفيديو ووافق على استخدام الرصيد أولًا.',
            requestFailed: 'تعذر بدء إنشاء الفيديو.',
            waiting: 'الفيديوهات تستغرق عادة وقتًا أطول من الصور. Nexa يتابع Job الحقيقي ولا يعرض نسبة وهمية.',
            real: 'الحالة المعروضة تأتي من Job الفعلي لدى مزود الفيديو.',
            imageToVideo: 'Image → Video',
            imageToVideoNote: 'لن نظهر زر Image → Video قبل توفير رابط صورة ثابت يستطيع مزود الفيديو قراءته. ربط التخزين السحابي هو الخطوة المطلوبة لتفعيله بأمان.',
            resume: 'استعادة آخر مهمة فيديو',
          }
        : {
            title: 'Video Studio',
            description: 'Turn a prompt into a real video job and track it until the file is ready to play and download.',
            jobTitle: 'Job name',
            project: 'Project',
            noProject: 'No project',
            prompt: 'Video prompt',
            placeholder: 'Example: a cinematic shot of a black electric car moving through a futuristic city at night, neon reflections, slow camera movement…',
            enhance: 'Enhance prompt',
            enhancing: 'Enhancing…',
            duration: 'Duration',
            resolution: 'Resolution',
            ratio: 'Aspect ratio',
            audio: 'Generate audio when supported by the selected model',
            mode: 'Generation mode',
            fast: 'Fast',
            balanced: 'Balanced',
            quality: 'Best quality',
            spend: 'I understand video generation is a paid job and may spend real OpenRouter credits.',
            submit: 'Start real video generation',
            submitting: 'Submitting video job…',
            status: 'Render status',
            queued: 'Queued',
            processing: 'Generating video',
            completed: 'Video completed',
            failed: 'Video generation failed',
            refreshing: 'Refreshing status…',
            refresh: 'Refresh status',
            model: 'Model',
            cost: 'Provider cost',
            play: 'Video is ready to play',
            download: 'Download MP4',
            missing: 'Enter a prompt and confirm credit usage first.',
            requestFailed: 'Unable to start video generation.',
            waiting: 'Video takes longer than images. Nexa tracks the real provider job and does not show a fake percentage.',
            real: 'The displayed state comes from the actual provider video job.',
            imageToVideo: 'Image → Video',
            imageToVideoNote: 'Nexa will not show a fake Image → Video button before cloud storage provides a stable image URL the video provider can fetch.',
            resume: 'Restore last video job',
          },
    [ar],
  );

  function labelForStatus(status: Status) {
    if (status === 'COMPLETED') return t.completed;
    if (status === 'FAILED' || status === 'CANCELED') return t.failed;
    if (status === 'QUEUED') return t.queued;
    return t.processing;
  }

  function clearTimer() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  useEffect(() => () => clearTimer(), []);

  async function poll(jobId: string, silent = false) {
    clearTimer();
    if (!silent) setBusy('poll');

    try {
      const response = await fetch(`/api/media/jobs/${encodeURIComponent(jobId)}/status`, {
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || t.requestFailed);

      const next = body as VideoState;
      setVideo(next);
      setError('');

      if (next.status === 'COMPLETED' || next.status === 'FAILED' || next.status === 'CANCELED') {
        localStorage.removeItem(ACTIVE_JOB_KEY);
      } else {
        localStorage.setItem(ACTIVE_JOB_KEY, jobId);
        pollTimer.current = setTimeout(() => void poll(jobId, true), 15_000);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.requestFailed);
    } finally {
      if (!silent) setBusy('');
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_JOB_KEY);
      if (stored) void poll(stored, true);
    } catch {}
  }, []);

  async function enhance() {
    if (!prompt.trim() || busy) return;
    setBusy('enhance');
    setError('');
    try {
      const output = await runTextAI(
        'writer',
        ar
          ? `حسّن الوصف التالي إلى برومبت فيديو سينمائي دقيق. حافظ على الفكرة ولا تضف علامات أو شخصيات غير مذكورة. أضف تفاصيل مفيدة فقط عن المشهد والإضاءة والحركة والكاميرا. أعد البرومبت فقط:\n\n${prompt}`
          : `Improve this into a precise cinematic video-generation prompt. Preserve the idea and do not invent brands or characters. Add only useful scene, lighting, motion, and camera detail. Return only the prompt:\n\n${prompt}`,
      );
      setPrompt(output.trim());
    } catch {
      setError(t.requestFailed);
    } finally {
      setBusy('');
    }
  }

  async function submit() {
    if (!prompt.trim() || !confirmSpend || busy) {
      setError(t.missing);
      return;
    }

    clearTimer();
    setBusy('submit');
    setError('');
    setVideo(null);

    try {
      const token = await getCsrfToken();
      const response = await fetch('/api/media/generate/video', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          title,
          projectId: projectId || null,
          prompt,
          duration,
          resolution,
          aspectRatio: ratio,
          generateAudio,
          mode,
          confirmSpend: true,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || t.requestFailed);

      const next = body as VideoState;
      setVideo(next);
      localStorage.setItem(ACTIVE_JOB_KEY, next.jobId);

      if (next.status !== 'COMPLETED' && next.status !== 'FAILED') {
        pollTimer.current = setTimeout(() => void poll(next.jobId, true), 12_000);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.requestFailed);
    } finally {
      setBusy('');
    }
  }

  const statusProgress = video?.status === 'COMPLETED' ? 100 : video?.status === 'FAILED' ? 0 : video?.status === 'QUEUED' ? 25 : video ? 60 : 0;

  return (
    <div className="mx-auto max-w-6xl" dir={ar ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex items-start gap-3">
        <span className="brand-gradient grid size-11 shrink-0 place-items-center rounded-2xl text-white">
          <Clapperboard size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{t.title}</h1>
          <p className="muted mt-1 max-w-3xl text-sm leading-6">{t.description}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.92fr_1.08fr]">
        <section className="space-y-4">
          <div className="surface rounded-3xl p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold sm:col-span-2">
                {t.jobTitle}
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none" />
              </label>
              <label className="text-sm font-bold">
                {t.project}
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3">
                  <option value="">{t.noProject}</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold">
                {t.mode}
                <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3">
                  <option value="fast">{t.fast}</option>
                  <option value="balanced">{t.balanced}</option>
                  <option value="quality">{t.quality}</option>
                </select>
              </label>
            </div>
          </div>

          <div className="surface rounded-3xl p-5">
            <label className="text-sm font-black">{t.prompt}</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.placeholder} rows={8} className="mt-2 w-full resize-none rounded-2xl border border-[var(--line)] bg-transparent p-4 text-start leading-7 outline-none focus:border-[var(--brand)]" />
            <div className="mt-2 flex justify-end">
              <button type="button" disabled={!prompt.trim() || Boolean(busy)} onClick={() => void enhance()} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--brand)] disabled:opacity-50">
                {busy === 'enhance' ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {busy === 'enhance' ? t.enhancing : t.enhance}
              </button>
            </div>
          </div>

          <div className="surface rounded-3xl p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-bold">{t.duration}<select value={duration} onChange={(e) => setDuration(Number(e.target.value) as 4 | 6 | 8)} className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"><option value={4}>4s</option><option value={6}>6s</option><option value={8}>8s</option></select></label>
              <label className="text-sm font-bold">{t.resolution}<select value={resolution} onChange={(e) => setResolution(e.target.value as typeof resolution)} className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"><option>720p</option><option>1080p</option></select></label>
              <label className="text-sm font-bold">{t.ratio}<select value={ratio} onChange={(e) => setRatio(e.target.value as typeof ratio)} className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"><option>16:9</option><option>9:16</option></select></label>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] p-4 text-sm">
              <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)} />
              <Volume2 size={17} className="text-[var(--brand)]" />
              <span>{t.audio}</span>
            </label>
          </div>

          <div className="surface rounded-2xl border border-dashed border-[var(--line)] p-4">
            <b className="text-sm">{t.imageToVideo}</b>
            <p className="muted mt-2 text-xs leading-5">{t.imageToVideoNote}</p>
          </div>

          <label className="surface flex cursor-pointer items-start gap-3 rounded-2xl p-4 text-sm leading-6">
            <input type="checkbox" checked={confirmSpend} onChange={(e) => setConfirmSpend(e.target.checked)} className="mt-1" />
            <span>{t.spend}</span>
          </label>

          <button type="button" onClick={() => void submit()} disabled={busy === 'submit'} className="brand-gradient flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-black text-white disabled:opacity-50">
            {busy === 'submit' ? <LoaderCircle size={19} className="animate-spin" /> : <Clapperboard size={19} />}
            {busy === 'submit' ? t.submitting : t.submit}
          </button>

          {error ? <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-600">{error}</div> : null}
        </section>

        <section className="surface min-h-[650px] rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black">{t.status}</h2>
            {video?.jobId && video.status !== 'COMPLETED' && video.status !== 'FAILED' ? (
              <button type="button" disabled={busy === 'poll'} onClick={() => void poll(video.jobId)} className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-bold disabled:opacity-50">
                {busy === 'poll' ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {busy === 'poll' ? t.refreshing : t.refresh}
              </button>
            ) : null}
          </div>

          {!video ? (
            <div className="muted grid min-h-[540px] place-items-center text-center">
              <div>
                {busy === 'submit' ? <LoaderCircle size={40} className="mx-auto animate-spin text-[var(--brand)]" /> : <Clapperboard size={44} className="mx-auto opacity-40" />}
                <p className="mx-auto mt-4 max-w-sm text-sm leading-6">{busy === 'submit' ? t.submitting : t.waiting}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <div className={`rounded-2xl border p-5 ${video.status === 'COMPLETED' ? 'border-emerald-500/30 bg-emerald-500/5' : video.status === 'FAILED' ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--line)]'}`}>
                <div className="flex items-center gap-3">
                  {video.status === 'COMPLETED' ? <CheckCircle2 className="text-emerald-600" size={24} /> : video.status === 'FAILED' ? <Clapperboard className="text-red-600" size={24} /> : <LoaderCircle className="animate-spin text-[var(--brand)]" size={24} />}
                  <div>
                    <b>{labelForStatus(video.status)}</b>
                    <div className="muted mt-1 text-xs" dir="ltr">{video.externalStatus ?? video.status}</div>
                  </div>
                </div>

                {video.status !== 'COMPLETED' && video.status !== 'FAILED' ? (
                  <div className="mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div className="brand-gradient h-full rounded-full transition-all duration-700" style={{ width: `${statusProgress}%` }} />
                    </div>
                    <p className="muted mt-2 text-[11px] leading-5">{t.waiting}</p>
                  </div>
                ) : null}

                {video.model ? <div className="muted mt-4 text-xs">{t.model}: <span dir="ltr">{video.model}</span></div> : null}
                {typeof video.cost === 'number' ? <div className="muted mt-1 text-xs">{t.cost}: ${video.cost.toFixed(4)}</div> : null}
                {video.error ? <div className="mt-3 text-sm text-red-600">{video.error}</div> : null}
              </div>

              {video.status === 'COMPLETED' && video.contentUrl ? (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-black">{t.play}</p>
                  <video key={video.contentUrl} src={video.contentUrl} controls playsInline className="max-h-[520px] w-full rounded-2xl bg-black" />
                  <a href={video.contentUrl} download className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white">
                    <Download size={17} /> {t.download}
                  </a>
                </div>
              ) : null}
            </div>
          )}

          <div className="muted mt-5 flex items-start gap-2 border-t border-[var(--line)] pt-4 text-xs leading-5">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" />
            <span>{t.real}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

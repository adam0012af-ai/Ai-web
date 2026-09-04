"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCcw, Sparkles, UploadCloud } from "lucide-react";

type JobStatus = "ready" | "approved" | "regenerating";

const pipeline = [
  "Idea",
  "Research",
  "Script",
  "Voice",
  "Visuals",
  "Edit",
  "Captions",
  "Metadata",
  "Review",
];

export default function ContentAutopilotPage() {
  const [topic, setTopic] = useState("قصة قصيرة موثقة عن الصبر");
  const [videosPerDay, setVideosPerDay] = useState(2);
  const [status, setStatus] = useState<JobStatus>("ready");
  const [version, setVersion] = useState(1);

  const caption = useMemo(
    () =>
      `نسخة ${version} • فيديو عربي قصير جاهز للمراجعة حول: ${topic}.\n\n#محتوى_عربي #قصص #تعلم`,
    [topic, version],
  );

  function approve() {
    setStatus("approved");
  }

  function regenerate() {
    setStatus("regenerating");
    window.setTimeout(() => {
      setVersion((current) => current + 1);
      setStatus("ready");
    }, 650);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8" dir="rtl">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-sm text-violet-200">
              <Sparkles className="h-4 w-4" /> Content Autopilot MVP
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">مصنع المحتوى الذكي</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
              الذكاء الاصطناعي يجهز الفيديو كاملًا، وأنت تراجع ثم تضغط موافقة قبل النشر.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            الوضع الحالي: مراجعة بشرية قبل النشر
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="text-xl font-semibold">إعداد القناة التجريبية</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">المنصة</span>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-medium">TikTok — المرحلة الأولى</div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">موضوع الفيديو القادم</span>
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-violet-400/50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">عدد الفيديوهات يوميًا</span>
              <input
                type="number"
                min={1}
                max={5}
                value={videosPerDay}
                onChange={(event) => setVideosPerDay(Math.max(1, Math.min(5, Number(event.target.value) || 1)))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-violet-400/50"
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
              <div className="flex items-center justify-between gap-3">
                <span>جدول اليوم</span>
                <span className="font-medium text-zinc-100">{videosPerDay} فيديو</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Clock3 className="h-4 w-4" /> المواعيد الفعلية سنربطها بالـScheduler في المرحلة التالية.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Pipeline</h2>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">جاهز للمراجعة</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {pipeline.map((step) => (
              <div key={step} className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3 text-center text-xs">
                <CheckCircle2 className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
                {step}
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
            <div className="aspect-[9/16] max-h-[520px] w-full bg-gradient-to-b from-zinc-800 to-black p-6 sm:p-8">
              <div className="flex h-full flex-col justify-between">
                <div className="text-xs text-zinc-500">PREVIEW • 1080×1920 • v{version}</div>
                <div className="text-center">
                  <div className="mx-auto max-w-sm rounded-2xl bg-black/45 p-4 text-xl font-bold leading-relaxed sm:text-2xl">
                    {topic}
                  </div>
                  <p className="mt-4 text-sm text-zinc-400">مكان معاينة الفيديو النهائي بعد تشغيل محرك الرندر.</p>
                </div>
                <div className="text-xs text-zinc-500">Auto captions • Arabic voice • TikTok safe area</div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-2 text-sm font-medium">Caption + Hashtags</div>
            <p className="whitespace-pre-line text-sm leading-6 text-zinc-400">{caption}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={approve}
              disabled={status !== "ready"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadCloud className="h-5 w-5" />
              {status === "approved" ? "تمت الموافقة" : "Approve & Publish"}
            </button>
            <button
              type="button"
              onClick={regenerate}
              disabled={status === "regenerating"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCcw className={`h-5 w-5 ${status === "regenerating" ? "animate-spin" : ""}`} />
              {status === "regenerating" ? "جاري إنشاء نسخة جديدة..." : "Reject & Regenerate"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

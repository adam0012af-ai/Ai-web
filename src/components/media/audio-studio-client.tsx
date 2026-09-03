'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioLines, FileAudio, Mic, MicOff, Sparkles, Square, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { AppLocale } from '@/lib/i18n';
import { getMediaMessages } from '@/lib/media-messages';
import { createMediaJob, runTextAI } from '@/lib/client/media-api';
import {
  createVoiceRecognition,
  isVoiceInputSupported,
  type SpeechRecognitionLike,
} from '@/lib/browser/voice';
import { MarkdownMessage } from '@/components/ai/markdown-message';

type ProjectOption = { id: string; name: string };

type BrowserVoice = {
  name: string;
  lang: string;
  voiceURI: string;
  voice: SpeechSynthesisVoice;
};

export function AudioStudioClient({
  locale,
  projects,
}: {
  locale: AppLocale;
  projects: ProjectOption[];
}) {
  const t = getMediaMessages(locale);
  const ar = locale === 'ar';

  const [tab, setTab] = useState<'tts' | 'stt' | 'file'>('tts');
  const [projectId, setProjectId] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [voices, setVoices] = useState<BrowserVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [audioFile, setAudioFile] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [busy, setBusy] = useState<'summary' | 'tts-save' | 'file-save' | ''>('');
  const [message, setMessage] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(isVoiceInputSupported());

    function loadVoices() {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return;
      }

      const available = window.speechSynthesis
        .getVoices()
        .map((voice) => ({
          name: voice.name,
          lang: voice.lang,
          voiceURI: voice.voiceURI,
          voice,
        }))
        .sort((a, b) => a.lang.localeCompare(b.lang));

      setVoices(available);

      if (!voiceUri && available.length) {
        const preferred =
          available.find((item) =>
            item.lang.toLowerCase().startsWith(ar ? 'ar' : 'en'),
          ) ?? available[0];

        setVoiceUri(preferred.voiceURI);
      }
    }

    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);

    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
      if (audioFile?.url) URL.revokeObjectURL(audioFile.url);
    };
  }, []);

  const filteredVoices = useMemo(() => {
    const preferred = voices.filter((item) =>
      item.lang.toLowerCase().startsWith(ar ? 'ar' : 'en'),
    );

    return preferred.length ? preferred : voices;
  }, [voices, ar]);

  function playTts() {
    if (!ttsText.trim() || typeof window === 'undefined') return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.lang = ar ? 'ar-EG' : 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;

    const selected = voices.find((item) => item.voiceURI === voiceUri);
    if (selected) utterance.voice = selected.voice;

    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopTts() {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  function toggleListening() {
    if (!voiceSupported || busy) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = createVoiceRecognition(locale, {
      onText: (text) => {
        setTranscript((current) =>
          current.trim() ? `${current.trim()} ${text}` : text,
        );
      },
      onEnd: () => {
        setListening(false);
        recognitionRef.current = null;
      },
      onError: () => {
        setListening(false);
        recognitionRef.current = null;
      },
    });

    if (!recognition) return;

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function summarize() {
    if (!transcript.trim() || busy) return;

    setBusy('summary');
    setSummary('');
    setMessage('');

    try {
      const text = await runTextAI(
        'summarizer',
        ar
          ? `لخص النص التالي بدقة، واستخرج أهم النقاط والقرارات والمهام إن وجدت:\n\n${transcript}`
          : `Summarize this transcript accurately and extract key points, decisions, and action items when present:\n\n${transcript}`,
      );

      setSummary(text);
    } catch {
      setMessage(t.common.failed);
    } finally {
      setBusy('');
    }
  }

  async function saveTtsDraft() {
    if (!ttsText.trim() || busy) return;

    setBusy('tts-save');
    setMessage('');

    try {
      const selected = voices.find((item) => item.voiceURI === voiceUri);

      await createMediaJob({
        kind: 'AUDIO',
        operation: 'AI_TTS_EXPORT',
        title: ar ? 'تعليق صوتي جديد' : 'New voice-over',
        prompt: ttsText,
        projectId: projectId || null,
        settings: {
          browserPreviewVoice: selected
            ? {
                name: selected.name,
                lang: selected.lang,
                voiceURI: selected.voiceURI,
              }
            : null,
          rate,
          pitch,
        },
      });

      setMessage(`${t.common.saved} ${t.common.providerWait}`);
    } catch {
      setMessage(t.common.failed);
    } finally {
      setBusy('');
    }
  }

  async function chooseAudio(file: File | undefined) {
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      setMessage(t.common.fileTooLarge);
      return;
    }

    if (audioFile?.url) URL.revokeObjectURL(audioFile.url);

    setAudioFile({
      file,
      url: URL.createObjectURL(file),
    });
  }

  async function saveFileDraft() {
    if (!audioFile || busy) return;

    setBusy('file-save');
    setMessage('');

    try {
      await createMediaJob({
        kind: 'AUDIO',
        operation: 'AUDIO_TRANSCRIBE',
        title: audioFile.file.name,
        projectId: projectId || null,
        settings: {
          source: {
            name: audioFile.file.name,
            type: audioFile.file.type,
            size: audioFile.file.size,
            localOnly: true,
          },
        },
      });

      setMessage(`${t.common.saved} ${t.audio.fileProviderWait}`);
    } catch {
      setMessage(t.common.failed);
    } finally {
      setBusy('');
    }
  }

  const tabs = [
    ['tts', t.audio.tts],
    ['stt', t.audio.stt],
    ['file', t.audio.file],
  ] as const;

  return (
    <div dir={ar ? 'rtl' : 'ltr'}>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full border px-3 py-2 text-sm font-bold ${
              tab === id
                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'border-[var(--line)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-5 surface rounded-2xl p-5">
        <label className="text-sm font-bold">
          {t.common.project}
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="mt-2 h-11 w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--card)] px-3"
          >
            <option value="">{t.common.noProject}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tab === 'tts' ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <div className="surface rounded-2xl p-5">
            <label className="text-sm font-bold">
              {t.audio.text}
              <Textarea
                value={ttsText}
                onChange={(event) => setTtsText(event.target.value)}
                rows={10}
                maxLength={15000}
                className="mt-2"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-bold">
                {t.audio.voice}
                <select
                  value={voiceUri}
                  onChange={(event) => setVoiceUri(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2"
                >
                  {filteredVoices.map((item) => (
                    <option key={item.voiceURI} value={item.voiceURI}>
                      {item.name} · {item.lang}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold">
                {t.audio.rate}: {rate.toFixed(1)}×
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.1}
                  value={rate}
                  onChange={(event) => setRate(Number(event.target.value))}
                  className="mt-4 w-full"
                />
              </label>

              <label className="text-sm font-bold">
                {t.audio.pitch}: {pitch.toFixed(1)}
                <input
                  type="range"
                  min={0.7}
                  max={1.3}
                  step={0.1}
                  value={pitch}
                  onChange={(event) => setPitch(Number(event.target.value))}
                  className="mt-4 w-full"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={playing ? stopTts : playTts}
                disabled={!ttsText.trim()}
              >
                {playing ? <Square size={15} /> : <Volume2 size={16} />}
                {playing ? t.audio.stop : t.audio.play}
              </Button>

              <Button
                variant="secondary"
                disabled={!ttsText.trim() || Boolean(busy)}
                onClick={() => void saveTtsDraft()}
              >
                <Sparkles size={16} />
                {busy === 'tts-save'
                  ? t.common.saving
                  : t.audio.saveTtsDraft}
              </Button>
            </div>
          </div>

          <div className="surface rounded-2xl p-5">
            <AudioLines size={28} className="text-[var(--brand)]" />
            <h2 className="mt-3 font-black">{t.audio.tts}</h2>
            <p className="muted mt-2 text-sm leading-6">
              {t.audio.exportAfterProvider}
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'stt' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <b>{t.audio.transcript}</b>

              {voiceSupported ? (
                <Button
                  variant={listening ? 'secondary' : 'primary'}
                  onClick={toggleListening}
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  {listening
                    ? t.audio.stopListening
                    : t.audio.startListening}
                </Button>
              ) : null}
            </div>

            {listening ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-500">
                <span className="size-2 animate-pulse rounded-full bg-current" />
                {t.audio.listening}
              </div>
            ) : null}

            <Textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={10}
              placeholder={t.audio.transcriptPlaceholder}
              className="mt-4"
            />

            <Button
              variant="secondary"
              className="mt-3"
              disabled={!transcript.trim() || Boolean(busy)}
              onClick={() => void summarize()}
            >
              <Sparkles size={16} />
              {busy === 'summary'
                ? t.audio.summarizing
                : t.audio.summarize}
            </Button>
          </div>

          <div className="surface rounded-2xl p-5">
            <b>{t.audio.summarize}</b>
            <div className="mt-4">
              {summary ? (
                <MarkdownMessage content={summary} />
              ) : (
                <p className="muted text-sm">—</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'file' ? (
        <div className="surface max-w-3xl rounded-2xl p-5">
          <b>{t.audio.audioFile}</b>

          {audioFile ? (
            <div className="mt-4">
              <audio src={audioFile.url} controls className="w-full" />
              <div className="muted mt-2 text-xs">
                {audioFile.file.name} ·{' '}
                {(audioFile.file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] p-8 text-sm">
              <FileAudio size={18} />
              {t.common.selectFile}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => void chooseAudio(event.target.files?.[0])}
              />
            </label>
          )}

          <p className="muted mt-3 text-xs leading-5">
            {t.audio.fileProviderWait}
          </p>

          <Button
            className="mt-4"
            variant="secondary"
            disabled={!audioFile || Boolean(busy)}
            onClick={() => void saveFileDraft()}
          >
            <Sparkles size={16} />
            {busy === 'file-save'
              ? t.common.saving
              : t.audio.saveTranscriptionDraft}
          </Button>
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-xl border border-[var(--line)] p-3 text-sm">
          {message}
        </div>
      ) : null}
    </div>
  );
}

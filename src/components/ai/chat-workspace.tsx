'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Copy,
  Download,
  Edit3,
  Mic,
  MicOff,
  Pin,
  Plus,
  Send,
  Sparkles,
  Square,
  Star,
  Trash2,
  Volume2,
  VolumeX,
  WandSparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AppLocale } from '@/lib/i18n';
import { getDashboardText } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';
import {
  createVoiceRecognition,
  isVoiceInputSupported,
  speakText,
  stopSpeaking,
  type SpeechRecognitionLike,
} from '@/lib/browser/voice';
import { MarkdownMessage } from './markdown-message';

type Conv = {
  id: string;
  title: string;
  pinned: boolean;
  favorite: boolean;
  updatedAt: string;
};

type Msg = {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
};

type ProjectContext = {
  id: string;
  name: string;
} | null;

export function ChatWorkspace({
  locale,
  project,
  initialConversationId,
}: {
  locale: AppLocale;
  project: ProjectContext;
  initialConversationId: string | null;
}) {
  const t = getDashboardText(locale);
  const p = getProductMessages(locale);
  const v = p.chatPro;
  const ar = locale === 'ar';

  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(
    initialConversationId,
  );
  const [messages, setMessages] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [uiError, setUiError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [autoSendVoice, setAutoSendVoice] = useState(false);
  const [speakingId, setSpeakingId] = useState('');
  const [speechRate, setSpeechRate] = useState(1);

  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const autoSendRef = useRef(false);

  useEffect(() => {
    autoSendRef.current = autoSendVoice;
  }, [autoSendVoice]);

  useEffect(() => {
    setVoiceSupported(isVoiceInputSupported());

    return () => {
      recognition.current?.abort();
      stopSpeaking();
    };
  }, []);

  async function csrf() {
    const response = await fetch('/api/csrf', { cache: 'no-store' });

    if (!response.ok) throw new Error(t.secureRequestError);

    const data = await response.json();

    if (!data?.token) throw new Error(t.missingTokenError);

    return data.token as string;
  }

  async function loadConversations() {
    try {
      const query = project
        ? `?project=${encodeURIComponent(project.id)}`
        : '';

      const response = await fetch(
        `/api/ai/conversations${query}`,
        { cache: 'no-store' },
      );

      if (!response.ok) {
        setUiError(t.loadConversationsError);
        return;
      }

      const data = await response.json();
      const list = Array.isArray(data?.conversations)
        ? data.conversations
        : [];

      setConvs(list);

      setActive((current) => {
        if (
          current &&
          list.some(
            (conversation: Conv) =>
              conversation.id === current,
          )
        ) {
          return current;
        }

        return list[0]?.id ?? null;
      });
    } catch {
      setUiError(t.loadConversationsError);
    }
  }

  async function loadMessages(id: string) {
    try {
      const response = await fetch(
        `/api/ai/conversations/${encodeURIComponent(id)}`,
        { cache: 'no-store' },
      );

      if (!response.ok) {
        setUiError(t.loadConversationError);
        return;
      }

      const data = await response.json();
      const loaded = Array.isArray(
        data?.conversation?.messages,
      )
        ? data.conversation.messages
        : [];

      setMessages(loaded);
      setUiError('');
    } catch {
      setUiError(t.loadConversationError);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, [project?.id]);

  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }

    void loadMessages(active);
  }, [active]);

  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, streaming]);

  function newChat() {
    abort.current?.abort();
    abort.current = null;
    recognition.current?.abort();
    stopSpeaking();
    setBusy(false);
    setActive(null);
    setMessages([]);
    setStreaming('');
    setInput('');
    setUiError('');
    setSpeakingId('');
    setListening(false);
  }

  async function sendText(
    rawText: string,
    clearComposer = true,
  ) {
    const text = rawText.trim();

    if (!text || busy) return;

    setBusy(true);
    setUiError('');
    if (clearComposer) setInput('');
    setStreaming('');

    const temp: Msg = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
    };

    setMessages((current) => [...current, temp]);

    try {
      const token = await csrf();
      const controller = new AbortController();
      abort.current = controller;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          conversationId: active,
          projectId: project?.id ?? null,
          message: text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = t.genericAiError;

        try {
          const data = await response.json();
          if (
            typeof data?.error === 'string' &&
            data.error.trim()
          ) {
            message = ar
              ? t.genericAiError
              : data.error;
          }
        } catch {}

        throw new Error(message);
      }

      const conversationId =
        response.headers.get('x-conversation-id');

      if (conversationId && !active) {
        setActive(conversationId);
      }

      const reader = response.body?.getReader();

      if (!reader) throw new Error(t.genericAiError);

      const decoder = new TextDecoder();
      let all = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        all += decoder.decode(value, {
          stream: true,
        });

        setStreaming(all);
      }

      all += decoder.decode();

      if (!all.trim()) {
        throw new Error(t.emptyAiError);
      }

      setMessages((current) => [
        ...current.filter(
          (message) => message.id !== temp.id,
        ),
        temp,
        {
          id: `assistant-${Date.now()}`,
          role: 'ASSISTANT',
          content: all,
        },
      ]);

      setStreaming('');
      await loadConversations();
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setUiError(
          error instanceof Error && error.message
            ? error.message
            : t.genericAiError,
        );
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  async function send() {
    await sendText(input);
  }

  function smartAction(action: string) {
    const commands: Record<string, string> = ar
      ? {
          shorten:
            'اختصر ردك السابق مع الحفاظ على أهم المعلومات.',
          expand:
            'وسّع ردك السابق وأضف التفاصيل العملية المهمة بدون حشو.',
          simplify:
            'بسّط ردك السابق واشرح الفكرة بلغة أسهل.',
          translate:
            'ترجم ردك السابق إلى اللغة الأخرى مع الحفاظ على المعنى والتنسيق.',
          steps:
            'حوّل ردك السابق إلى خطوات تنفيذ واضحة ومرتبة.',
          table:
            'حوّل المعلومات المناسبة من ردك السابق إلى جدول منظم.',
          continue:
            'أكمل من حيث توقفت في الرد السابق بدون تكرار ما سبق.',
          improve:
            'راجع ردك السابق واكتب نسخة أقوى وأكثر دقة واحترافية.',
        }
      : {
          shorten:
            'Shorten your previous answer while preserving the most important information.',
          expand:
            'Expand your previous answer with useful practical detail and no filler.',
          simplify:
            'Simplify your previous answer and explain it in easier language.',
          translate:
            'Translate your previous answer into the other language while preserving meaning and formatting.',
          steps:
            'Turn your previous answer into clear ordered execution steps.',
          table:
            'Convert the suitable information from your previous answer into a structured table.',
          continue:
            'Continue from where your previous answer stopped without repeating it.',
          improve:
            'Review your previous answer and produce a stronger, more accurate version.',
        };

    void sendText(commands[action] ?? commands.improve);
  }

  function startVoice() {
    if (!voiceSupported || busy) return;

    if (listening) {
      recognition.current?.stop();
      return;
    }

    stopSpeaking();
    setSpeakingId('');

    let captured = '';

    const instance = createVoiceRecognition(locale, {
      onText: (text) => {
        captured = text;
        setInput((current) =>
          current.trim()
            ? `${current.trim()} ${text}`
            : text,
        );
      },
      onEnd: () => {
        setListening(false);
        recognition.current = null;

        if (autoSendRef.current && captured.trim()) {
          void sendText(captured.trim());
        }
      },
      onError: () => {
        setListening(false);
        recognition.current = null;
      },
    });

    if (!instance) {
      setUiError(v.voiceUnsupported);
      return;
    }

    recognition.current = instance;
    setListening(true);
    instance.start();
  }

  function toggleSpeak(message: Msg) {
    if (speakingId === message.id) {
      stopSpeaking();
      setSpeakingId('');
      return;
    }

    stopSpeaking();

    const started = speakText(
      message.content,
      locale,
      () => setSpeakingId(''),
      speechRate,
    );

    if (started) {
      setSpeakingId(message.id);
    }
  }

  async function mutate(
    id: string,
    action: 'delete' | 'pin' | 'favorite' | 'rename',
    value?: string,
  ) {
    if (
      action === 'delete' &&
      !confirm(t.deleteConversation)
    ) {
      return;
    }

    try {
      setUiError('');
      const token = await csrf();

      const response = await fetch(
        `/api/ai/conversations/${encodeURIComponent(id)}`,
        {
          method: action === 'delete' ? 'DELETE' : 'PATCH',
          headers: {
            'content-type': 'application/json',
            'x-csrf-token': token,
          },
          body:
            action === 'delete'
              ? undefined
              : JSON.stringify({ action, value }),
        },
      );

      if (!response.ok) {
        throw new Error(t.updateConversationError);
      }

      if (action === 'delete' && active === id) {
        setActive(null);
        setMessages([]);
      }

      await loadConversations();
    } catch (error) {
      setUiError(
        error instanceof Error
          ? error.message
          : t.updateConversationError,
      );
    }
  }

  async function copyMessage(message: Msg) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(''), 1200);
  }

  function downloadMessage(message: Msg) {
    const blob = new Blob([message.content], {
      type: 'text/markdown;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'nexa-ai-response.md';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const actions = [
    ['shorten', v.shorten],
    ['expand', v.expand],
    ['simplify', v.simplify],
    ['translate', v.translate],
    ['steps', v.steps],
    ['table', v.table],
    ['continue', v.continue],
    ['improve', v.improve],
  ] as const;

  return (
    <div
      className="surface grid min-h-[calc(100dvh-155px)] overflow-hidden rounded-2xl lg:grid-cols-[280px_1fr]"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <aside className="border-b border-[var(--line)] p-3 lg:border-b-0 lg:border-e">
        {project ? (
          <div className="mb-3 rounded-xl border border-[var(--brand)]/25 bg-[var(--brand)]/10 p-3">
            <div className="flex items-center gap-2 text-sm font-black">
              <Brain size={16} className="text-[var(--brand)]" />
              {project.name}
            </div>
            <div className="muted mt-1 text-xs">
              {v.memoryActive}
            </div>
          </div>
        ) : null}

        <Button className="w-full" onClick={newChat}>
          <Plus size={16} />
          {t.newChat}
        </Button>

        <Input
          className="mt-3 h-9"
          placeholder={t.searchConversations}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />

        <div className="mt-3 max-h-40 space-y-1 overflow-auto sm:max-h-48 lg:max-h-[65vh]">
          {convs
            .filter((conversation) =>
              (conversation.title ?? '')
                .toLowerCase()
                .includes(q.toLowerCase()),
            )
            .map((conversation) => (
              <div
                key={conversation.id}
                className={`group rounded-xl p-2 ${
                  active === conversation.id
                    ? 'bg-[var(--brand)]/10'
                    : ''
                }`}
              >
                <button
                  onClick={() => setActive(conversation.id)}
                  className="w-full truncate text-start text-sm font-semibold"
                >
                  {conversation.pinned && '📌 '}
                  {conversation.title ||
                    t.untitledConversation}
                </button>

                <div className="mt-1 flex gap-3 py-1 lg:hidden lg:group-hover:flex">
                  <button
                    aria-label={t.renameConversation}
                    onClick={() => {
                      const value = prompt(
                        t.renameConversation,
                        conversation.title,
                      );

                      if (value) {
                        void mutate(
                          conversation.id,
                          'rename',
                          value,
                        );
                      }
                    }}
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    aria-label="Pin"
                    onClick={() =>
                      void mutate(conversation.id, 'pin')
                    }
                  >
                    <Pin size={13} />
                  </button>

                  <button
                    aria-label="Favorite"
                    onClick={() =>
                      void mutate(
                        conversation.id,
                        'favorite',
                      )
                    }
                  >
                    <Star size={13} />
                  </button>

                  <button
                    aria-label="Delete"
                    onClick={() =>
                      void mutate(
                        conversation.id,
                        'delete',
                      )
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <div>
            <b>{t.aiAssistant}</b>
            <span className="muted ms-2 hidden text-xs sm:inline">
              {project ? v.memoryActive : t.providerRouting}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="muted flex items-center gap-1 text-[11px]">
              <Volume2 size={13} />
              <select
                value={speechRate}
                onChange={(event) =>
                  setSpeechRate(Number(event.target.value))
                }
                className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 py-1"
                aria-label={v.voiceSpeed}
              >
                <option value="0.8">0.8×</option>
                <option value="1">1×</option>
                <option value="1.2">1.2×</option>
                <option value="1.4">1.4×</option>
              </select>
            </label>

            {voiceSupported ? (
              <label className="muted hidden items-center gap-1 text-[11px] sm:flex">
                <input
                  type="checkbox"
                  checked={autoSendVoice}
                  onChange={(event) =>
                    setAutoSendVoice(event.target.checked)
                  }
                />
                {v.autoSend}
              </label>
            ) : null}
          </div>
        </div>

        {uiError ? (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
            {uiError}
          </div>
        ) : null}

        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {!messages.length && !streaming ? (
              <div className="py-12 text-center sm:py-20">
                <Sparkles
                  className="mx-auto text-[var(--brand)]"
                  size={30}
                />
                <h2 className="mt-3 text-2xl font-black">
                  {t.workingOn}
                </h2>

                <p className="muted mt-2">
                  {project
                    ? p.projects.usingMemory
                    : t.startConversation}
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[t.prompt1, t.prompt2, t.prompt3].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
                      >
                        {suggestion}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {messages.map((message) =>
              message.role === 'USER' ? (
                <div
                  key={message.id}
                  className="ms-auto max-w-[88%] rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm leading-7 text-white"
                  dir="auto"
                >
                  {message.content}
                </div>
              ) : message.role === 'ASSISTANT' ? (
                <article key={message.id} className="group">
                  <MarkdownMessage content={message.content} />

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() =>
                        void copyMessage(message)
                      }
                    >
                      <Copy size={14} />
                      <span className="text-xs">
                        {copiedId === message.id
                          ? ar
                            ? 'تم النسخ'
                            : 'Copied'
                          : p.common.copy}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => toggleSpeak(message)}
                    >
                      {speakingId === message.id ? (
                        <VolumeX size={14} />
                      ) : (
                        <Volume2 size={14} />
                      )}
                      <span className="hidden text-xs sm:inline">
                        {speakingId === message.id
                          ? v.stopReading
                          : v.readAnswer}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() =>
                        downloadMessage(message)
                      }
                    >
                      <Download size={14} />
                    </Button>
                  </div>

                  {message.id ===
                  [...messages]
                    .reverse()
                    .find((item) => item.role === 'ASSISTANT')
                    ?.id ? (
                    <div className="mt-3">
                      <div className="muted mb-2 flex items-center gap-1 text-[11px] font-bold">
                        <WandSparkles size={13} />
                        {v.smartActions}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {actions.map(([id, label]) => (
                          <button
                            key={id}
                            disabled={busy}
                            onClick={() => smartAction(id)}
                            className="rounded-full border border-[var(--line)] px-2.5 py-1.5 text-xs transition hover:bg-[var(--brand)]/10 disabled:opacity-40"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              ) : null,
            )}

            {streaming ? (
              <div>
                <MarkdownMessage content={streaming} />
                <span className="animate-pulse">▍</span>
              </div>
            ) : null}

            <div ref={bottom} />
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-[var(--line)] bg-[var(--card)]/95 p-3 backdrop-blur-xl sm:p-4">
          <div className="mx-auto max-w-3xl">
            {listening ? (
              <div className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">
                <span className="size-2 animate-pulse rounded-full bg-current" />
                {v.listening}
              </div>
            ) : null}

            <div className="flex items-end gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-2">
              {voiceSupported ? (
                <Button
                  type="button"
                  variant={listening ? 'secondary' : 'ghost'}
                  onClick={startVoice}
                  disabled={busy}
                  className={`size-10 shrink-0 rounded-xl p-0 ${
                    listening ? 'text-red-500' : ''
                  }`}
                  aria-label={
                    listening ? v.stopVoice : v.startVoice
                  }
                >
                  {listening ? (
                    <MicOff size={18} />
                  ) : (
                    <Mic size={18} />
                  )}
                </Button>
              ) : null}

              <Textarea
                rows={1}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
                onInput={(event) => {
                  event.currentTarget.style.height = 'auto';
                  event.currentTarget.style.height =
                    `${Math.min(
                      event.currentTarget.scrollHeight,
                      160,
                    )}px`;
                }}
                placeholder={
                  listening ? v.listening : t.messagePlaceholder
                }
                disabled={busy}
                className="min-h-11 max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />

              {busy ? (
                <Button
                  variant="secondary"
                  onClick={() => abort.current?.abort()}
                  className="size-10 shrink-0 rounded-xl p-0"
                  aria-label={t.stop}
                >
                  <Square size={15} />
                </Button>
              ) : (
                <Button
                  onClick={() => void send()}
                  disabled={!input.trim()}
                  className="size-10 shrink-0 rounded-xl p-0"
                  aria-label={t.send}
                >
                  <Send size={16} />
                </Button>
              )}
            </div>

            {voiceSupported ? (
              <label className="muted mt-2 flex items-center gap-2 px-1 text-[11px] sm:hidden">
                <input
                  type="checkbox"
                  checked={autoSendVoice}
                  onChange={(event) =>
                    setAutoSendVoice(event.target.checked)
                  }
                />
                {v.autoSend}
              </label>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

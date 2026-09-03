'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  Pin,
  Plus,
  Send,
  Square,
  Star,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AppLocale } from '@/lib/i18n';
import { getDashboardText } from '@/lib/i18n';
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

export function ChatWorkspace({ locale }: { locale: AppLocale }) {
  const t = getDashboardText(locale);
  const ar = locale === 'ar';

  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [uiError, setUiError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  async function csrf() {
    const response = await fetch('/api/csrf', { cache: 'no-store' });

    if (!response.ok) throw new Error(t.secureRequestError);

    const data = await response.json();

    if (!data?.token) throw new Error(t.missingTokenError);

    return data.token as string;
  }

  async function loadConversations() {
    try {
      const response = await fetch('/api/ai/conversations', {
        cache: 'no-store',
      });

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
          list.some((conversation: Conv) => conversation.id === current)
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
      const loaded = Array.isArray(data?.conversation?.messages)
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
  }, []);

  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }

    void loadMessages(active);
  }, [active]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  function newChat() {
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
    setActive(null);
    setMessages([]);
    setStreaming('');
    setInput('');
    setUiError('');
  }

  async function send() {
    const text = input.trim();

    if (!text || busy) return;

    setBusy(true);
    setUiError('');
    setInput('');
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
          message: text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = t.genericAiError;

        try {
          const data = await response.json();

          if (typeof data?.error === 'string' && data.error.trim()) {
            message = data.error;
          }
        } catch {}

        throw new Error(message);
      }

      const conversationId = response.headers.get('x-conversation-id');

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

        all += decoder.decode(value, { stream: true });
        setStreaming(all);
      }

      all += decoder.decode();

      if (!all.trim()) throw new Error(t.emptyAiError);

      setMessages((current) => [
        ...current.filter((message) => message.id !== temp.id),
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
        const message =
          error instanceof Error && error.message
            ? error.message
            : t.genericAiError;

        setUiError(message);
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  async function mutate(
    id: string,
    action: 'delete' | 'pin' | 'favorite' | 'rename',
    value?: string,
  ) {
    if (action === 'delete' && !confirm(t.deleteConversation)) return;

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
              : JSON.stringify({
                  action,
                  value,
                }),
        },
      );

      if (!response.ok) throw new Error(t.updateConversationError);

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

  return (
    <div
      className="surface grid min-h-[calc(100dvh-155px)] overflow-hidden rounded-2xl lg:grid-cols-[280px_1fr]"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <aside className="border-b border-[var(--line)] p-3 lg:border-b-0 lg:border-e">
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
                  {conversation.title || t.untitledConversation}
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
                        void mutate(conversation.id, 'rename', value);
                      }
                    }}
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    aria-label="Pin"
                    onClick={() => void mutate(conversation.id, 'pin')}
                  >
                    <Pin size={13} />
                  </button>

                  <button
                    aria-label="Favorite"
                    onClick={() => void mutate(conversation.id, 'favorite')}
                  >
                    <Star size={13} />
                  </button>

                  <button
                    aria-label="Delete"
                    onClick={() => void mutate(conversation.id, 'delete')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <div className="border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
          <b>{t.aiAssistant}</b>
          <span className="muted ms-2 text-xs">{t.providerRouting}</span>
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
                <h2 className="text-2xl font-black">{t.workingOn}</h2>

                <p className="muted mt-2">{t.startConversation}</p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[t.prompt1, t.prompt2, t.prompt3].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
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

                  <div className="mt-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => void copyMessage(message)}
                      aria-label="Copy"
                    >
                      <Copy size={14} />
                      <span className="text-xs">
                        {copiedId === message.id
                          ? ar
                            ? 'تم النسخ'
                            : 'Copied'
                          : ar
                            ? 'نسخ'
                            : 'Copy'}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => downloadMessage(message)}
                      aria-label="Download"
                    >
                      <Download size={14} />
                    </Button>
                  </div>
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
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-2">
            <Textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              onInput={(event) => {
                event.currentTarget.style.height = 'auto';
                event.currentTarget.style.height = `${Math.min(
                  event.currentTarget.scrollHeight,
                  160,
                )}px`;
              }}
              placeholder={t.messagePlaceholder}
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
        </div>
      </section>
    </div>
  );
}

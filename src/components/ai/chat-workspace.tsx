'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Edit3, Pin, Plus, Send, Square, Star, Trash2 } from 'lucide-react';

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

async function csrf() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Unable to start a secure request.');
  }

  const data = await response.json();

  if (!data?.token) {
    throw new Error('Security token is missing.');
  }

  return data.token as string;
}

export function ChatWorkspace() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [uiError, setUiError] = useState('');

  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  async function loadConversations() {
    try {
      const response = await fetch('/api/ai/conversations', {
        cache: 'no-store',
      });

      if (!response.ok) {
        setUiError('Unable to load conversations right now.');
        return;
      }

      const data = await response.json();
      const list = Array.isArray(data?.conversations) ? data.conversations : [];

      setConvs(list);

      setActive((current) => {
        if (current && list.some((conversation: Conv) => conversation.id === current)) {
          return current;
        }

        return list[0]?.id ?? null;
      });
    } catch {
      setUiError('Unable to load conversations right now.');
    }
  }

  async function loadMessages(id: string) {
    try {
      const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        setUiError('Unable to load this conversation.');
        return;
      }

      const data = await response.json();
      const loaded = Array.isArray(data?.conversation?.messages)
        ? data.conversation.messages
        : [];

      setMessages(loaded);
      setUiError('');
    } catch {
      setUiError('Unable to load this conversation.');
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
        let message = 'Unable to complete that request right now.';

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

      if (!reader) {
        throw new Error('The AI response stream could not be opened.');
      }

      const decoder = new TextDecoder();
      let all = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        all += decoder.decode(value, { stream: true });
        setStreaming(all);
      }

      all += decoder.decode();

      if (!all.trim()) {
        throw new Error('The AI returned an empty response.');
      }

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
            : 'Unable to complete that request right now.';

        setUiError(message);
        setMessages((current) => [
          ...current,
          {
            id: `err-${Date.now()}`,
            role: 'ASSISTANT',
            content: 'Unable to complete that request right now.',
          },
        ]);
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
    if (action === 'delete' && !confirm('Delete this conversation permanently?')) {
      return;
    }

    try {
      setUiError('');
      const token = await csrf();

      const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, {
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
      });

      if (!response.ok) {
        throw new Error('Unable to update the conversation.');
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
          : 'Unable to update the conversation.',
      );
    }
  }

  return (
    <div className="surface grid min-h-[calc(100vh-150px)] overflow-hidden rounded-2xl lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[var(--line)] p-3 lg:border-b-0 lg:border-r">
        <Button className="w-full" onClick={newChat}>
          <Plus size={16} />
          New chat
        </Button>

        <Input
          className="mt-3 h-9"
          placeholder="Search conversations"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />

        <div className="mt-3 max-h-48 space-y-1 overflow-auto lg:max-h-[65vh]">
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
                  active === conversation.id ? 'bg-[var(--brand)]/10' : ''
                }`}
              >
                <button
                  onClick={() => setActive(conversation.id)}
                  className="w-full truncate text-left text-sm font-semibold"
                >
                  {conversation.pinned && '📌 '}
                  {conversation.title || 'Untitled conversation'}
                </button>

                <div className="mt-1 flex gap-3 py-1 lg:hidden lg:group-hover:flex">
                  <button
                    aria-label="Rename"
                    onClick={() => {
                      const value = prompt(
                        'Conversation name',
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
          <b>AI Assistant</b>
          <span className="muted ml-2 text-xs">
            Automatic provider routing active
          </span>
        </div>

        {uiError ? (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
            {uiError}
          </div>
        ) : null}

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {!messages.length && !streaming ? (
              <div className="py-16 text-center sm:py-20">
                <h2 className="text-2xl font-black">
                  What are you working on?
                </h2>

                <p className="muted mt-2">
                  Start a conversation or try one of these prompts.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'Turn these notes into an action plan',
                    'Explain this code simply',
                    'Draft a launch announcement',
                  ].map((suggestion) => (
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

            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'USER'
                    ? 'ml-auto max-w-[85%] rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm text-white'
                    : 'group max-w-[92%] text-sm leading-7'
                }
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {message.role === 'ASSISTANT' ? (
                  <button
                    className="muted mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() =>
                      navigator.clipboard.writeText(message.content)
                    }
                  >
                    <Copy size={14} />
                  </button>
                ) : null}
              </div>
            ))}

            {streaming ? (
              <div className="max-w-[92%] whitespace-pre-wrap text-sm leading-7">
                {streaming}
                <span className="animate-pulse">▍</span>
              </div>
            ) : null}

            <div ref={bottom} />
          </div>
        </div>

        <div className="border-t border-[var(--line)] p-3 sm:p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Message AI Assistant…"
              disabled={busy}
            />

            {busy ? (
              <Button variant="secondary" onClick={() => abort.current?.abort()}>
                <Square size={15} />
                Stop
              </Button>
            ) : (
              <Button onClick={() => void send()} disabled={!input.trim()}>
                <Send size={16} />
                <span className="hidden sm:inline">Send</span>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { AppLocale } from '@/lib/i18n';
import { MarkdownMessage } from './markdown-message';

type ImagePayload = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
};

type WorkspaceMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachmentLabel?: string;
  fallbackUsed?: boolean;
  cached?: boolean;
  latency?: number;
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
  const isImage = slug === 'image';

  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);

  const [image, setImage] = useState<ImagePayload | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageName, setImageName] = useState('');

  const [documentName, setDocumentName] = useState('');
  const [documentText, setDocumentText] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const labels = useMemo(
    () =>
      ar
        ? {
            welcome: `ابدأ مع ${title}`,
            subtitle:
              'اكتب وارسل من نفس المكان، وبعد الرد كمل بأسئلة متابعة بدون فتح خانات جديدة.',
            placeholder: 'اكتب رسالتك…',
            send: 'إرسال',
            generating: 'جاري التفكير…',
            clear: 'محادثة جديدة',
            attach: 'إرفاق',
            image: 'صورة',
            file: 'ملف نصي',
            remove: 'إزالة المرفق',
            copy: 'نسخ',
            copied: 'تم النسخ',
            regenerate: 'إعادة الرد',
            download: 'تنزيل',
            fallback: 'تم استخدام مسار احتياطي',
            cached: 'نتيجة محفوظة',
            imageTooLarge: 'الصورة أكبر من 2.5 MB.',
            fileTooLarge: 'الملف أكبر من 1 MB.',
            badImage: 'استخدم JPG أو PNG أو WEBP.',
            readError: 'تعذر قراءة الملف.',
            chooseImage: 'اختر صورة أولًا.',
            attachmentStays:
              'المرفق يظل جزءًا من السياق حتى تقوم بإزالته.',
            promptA: isImage
              ? 'حلّل الصورة واذكر فقط ما هو ظاهر بوضوح'
              : 'ساعدني خطوة بخطوة',
            promptB: isImage
              ? 'استخرج النص الظاهر بدون تخمين'
              : 'حسّن هذه النتيجة واجعلها أكثر احترافية',
            promptC: isImage
              ? 'ما الذي يمكن استنتاجه وما الذي لا يمكن تأكيده؟'
              : 'اعطني نسخة مختصرة وعملية',
          }
        : {
            welcome: `Start with ${title}`,
            subtitle:
              'Write, send, and continue with follow-up questions in one conversation.',
            placeholder: 'Message AI…',
            send: 'Send',
            generating: 'Thinking…',
            clear: 'New conversation',
            attach: 'Attach',
            image: 'Image',
            file: 'Text file',
            remove: 'Remove attachment',
            copy: 'Copy',
            copied: 'Copied',
            regenerate: 'Regenerate',
            download: 'Download',
            fallback: 'Fallback route used',
            cached: 'Cached result',
            imageTooLarge: 'The image is larger than 2.5 MB.',
            fileTooLarge: 'The file is larger than 1 MB.',
            badImage: 'Use JPG, PNG, or WEBP.',
            readError: 'Unable to read the file.',
            chooseImage: 'Choose an image first.',
            attachmentStays:
              'The attachment stays in context until you remove it.',
            promptA: isImage
              ? 'Analyze only what is clearly visible in this image'
              : 'Help me step by step',
            promptB: isImage
              ? 'Extract the visible text without guessing'
              : 'Improve this result and make it more professional',
            promptC: isImage
              ? 'What can be inferred, and what cannot be confirmed?'
              : 'Give me a concise, practical version',
          },
    [ar, isImage, title],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function getCsrf() {
    const response = await fetch('/api/csrf', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(
        ar ? 'تعذر بدء طلب آمن.' : 'Unable to start a secure request.',
      );
    }

    const data = await response.json();

    if (!data?.token) {
      throw new Error(
        ar ? 'رمز الحماية غير متوفر.' : 'Security token is missing.',
      );
    }

    return data.token as string;
  }

  function currentAttachmentLabel() {
    return imageName || documentName || undefined;
  }

  function buildRequestInput(text: string) {
    if (!documentText) return text;

    return `${text}

--- Attached document: ${documentName || 'document'} ---
${documentText}`;
  }

  function buildHistory(source: WorkspaceMessage[]) {
    return source
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 12000),
      }));
  }

  async function requestResponse({
    text,
    historySource,
    replaceAssistantId,
    appendUser = true,
  }: {
    text: string;
    historySource: WorkspaceMessage[];
    replaceAssistantId?: string;
    appendUser?: boolean;
  }) {
    if (busy) return;

    const displayText = text.trim();

    if (!displayText) return;

    if (isImage && !image) {
      setError(labels.chooseImage);
      return;
    }

    setBusy(true);
    setError('');
    setAttachOpen(false);

    const userMessage: WorkspaceMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: displayText,
      attachmentLabel: currentAttachmentLabel(),
    };

    if (appendUser) {
      setMessages((current) => [...current, userMessage]);
    }

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
          input: buildRequestInput(displayText),
          images: image ? [image] : undefined,
          history: buildHistory(historySource),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            (ar ? 'تعذر تنفيذ الطلب.' : 'Unable to complete the request.'),
        );
      }

      const assistantMessage: WorkspaceMessage = {
        id: replaceAssistantId ?? `assistant-${Date.now()}`,
        role: 'assistant',
        content: String(data.text ?? ''),
        fallbackUsed: Boolean(data.fallbackUsed),
        cached: Boolean(data.cached),
        latency:
          typeof data.latency === 'number' ? data.latency : undefined,
      };

      setMessages((current) => {
        if (replaceAssistantId) {
          return current.map((message) =>
            message.id === replaceAssistantId
              ? assistantMessage
              : message,
          );
        }

        return [...current, assistantMessage];
      });

      if (appendUser) {
        setInput('');
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : ar
            ? 'تعذر تنفيذ الطلب.'
            : 'Unable to complete the request.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    let text = input.trim();

    if (!text && isImage && image) {
      text = ar
        ? 'حلّل هذه الصورة بدقة، واذكر فقط ما يمكنك تأكيده من الصورة نفسها.'
        : 'Analyze this image carefully and state only what can be supported by the image itself.';
    }

    if (!text) return;

    const historySource = [...messages];

    await requestResponse({
      text,
      historySource,
      appendUser: true,
    });
  }

  async function regenerate(assistantId: string) {
    const assistantIndex = messages.findIndex(
      (message) => message.id === assistantId,
    );

    if (assistantIndex < 0) return;

    let userIndex = assistantIndex - 1;

    while (userIndex >= 0 && messages[userIndex]?.role !== 'user') {
      userIndex--;
    }

    const userMessage = messages[userIndex];

    if (!userMessage || userMessage.role !== 'user') return;

    await requestResponse({
      text: userMessage.content,
      historySource: messages.slice(0, userIndex),
      replaceAssistantId: assistantId,
      appendUser: false,
    });
  }

  function clearConversation() {
    setMessages([]);
    setInput('');
    setError('');
    setImage(null);
    setImagePreview('');
    setImageName('');
    setDocumentName('');
    setDocumentText('');
  }

  function removeAttachment() {
    setImage(null);
    setImagePreview('');
    setImageName('');
    setDocumentName('');
    setDocumentText('');
    setError('');
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
      setError(labels.imageTooLarge);
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
      setImageName(file.name);
      setDocumentName('');
      setDocumentText('');
      setError('');
    } catch {
      setError(labels.readError);
    } finally {
      event.target.value = '';
      setAttachOpen(false);
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

      setDocumentText(text.slice(0, 22000));
      setDocumentName(file.name);
      setImage(null);
      setImagePreview('');
      setImageName('');
      setError('');
    } catch {
      setError(labels.readError);
    } finally {
      event.target.value = '';
      setAttachOpen(false);
    }
  }

  async function copyMessage(message: WorkspaceMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(''), 1400);
  }

  function downloadMessage(message: WorkspaceMessage) {
    const blob = new Blob([message.content], {
      type: 'text/markdown;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${slug}-response.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadConversation() {
    if (!messages.length) return;

    const content = messages
      .map(
        (message) =>
          `## ${message.role === 'user' ? 'User' : 'AI'}\n\n${message.content}`,
      )
      .join('\n\n---\n\n');

    const blob = new Blob([content], {
      type: 'text/markdown;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${slug}-conversation.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  const suggestions = [
    labels.promptA,
    labels.promptB,
    labels.promptC,
  ];

  return (
    <section
      className="surface relative flex min-h-[calc(100dvh-235px)] flex-col overflow-hidden rounded-2xl"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
            <Sparkles size={17} />
          </span>

          <div className="min-w-0">
            <div className="truncate text-sm font-black">{title}</div>
            <div className="muted hidden truncate text-xs sm:block">
              {description}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            className="px-2"
            onClick={downloadConversation}
            disabled={!messages.length}
            aria-label={labels.download}
          >
            <Download size={16} />
          </Button>

          <Button
            variant="ghost"
            className="px-2"
            onClick={clearConversation}
            aria-label={labels.clear}
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">{labels.clear}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-3xl">
          {!messages.length ? (
            <div className="flex min-h-[48vh] flex-col items-center justify-center text-center">
              <span className="brand-gradient grid size-14 place-items-center rounded-2xl shadow-lg">
                <Sparkles size={24} />
              </span>

              <h2 className="mt-5 text-2xl font-black sm:text-3xl">
                {labels.welcome}
              </h2>

              <p className="muted mt-2 max-w-xl text-sm leading-7">
                {labels.subtitle}
              </p>

              <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-[var(--line)] px-3 py-2 text-sm transition hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {messages.map((message) =>
                message.role === 'user' ? (
                  <div
                    key={message.id}
                    className="ms-auto max-w-[90%] sm:max-w-[78%]"
                  >
                    {message.attachmentLabel ? (
                      <div className="muted mb-2 flex items-center justify-end gap-1.5 text-xs">
                        <Paperclip size={13} />
                        <span className="max-w-60 truncate">
                          {message.attachmentLabel}
                        </span>
                      </div>
                    ) : null}

                    <div
                      className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm leading-7 text-white"
                      dir="auto"
                    >
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <article
                    key={message.id}
                    className="group max-w-full"
                  >
                    <div className="flex items-start gap-3">
                      <span className="brand-gradient mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black">
                        AI
                      </span>

                      <div className="min-w-0 flex-1">
                        <MarkdownMessage content={message.content} />

                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          <Button
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => void copyMessage(message)}
                          >
                            {copiedId === message.id ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                            {copiedId === message.id
                              ? labels.copied
                              : labels.copy}
                          </Button>

                          <Button
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            disabled={busy}
                            onClick={() => void regenerate(message.id)}
                          >
                            <RefreshCw size={14} />
                            {labels.regenerate}
                          </Button>

                          <Button
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => downloadMessage(message)}
                          >
                            <Download size={14} />
                            {labels.download}
                          </Button>

                          {message.fallbackUsed ? (
                            <span className="muted rounded-full border border-[var(--line)] px-2 py-1 text-[10px]">
                              {labels.fallback}
                            </span>
                          ) : null}

                          {message.cached ? (
                            <span className="muted rounded-full border border-[var(--line)] px-2 py-1 text-[10px]">
                              {labels.cached}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ),
              )}

              {busy ? (
                <div className="flex items-center gap-3">
                  <span className="brand-gradient grid size-8 place-items-center rounded-lg text-xs font-black">
                    AI
                  </span>
                  <div className="muted flex items-center gap-2 text-sm">
                    <span className="flex gap-1">
                      <i className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-.2s]" />
                      <i className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-.1s]" />
                      <i className="size-1.5 animate-bounce rounded-full bg-current" />
                    </span>
                    {labels.generating}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {error ? (
        <div className="mx-3 mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300 sm:mx-5">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-0 border-t border-[var(--line)] bg-[var(--card)]/95 p-3 backdrop-blur-xl sm:p-4">
        <div className="mx-auto max-w-3xl">
          {imagePreview || documentName ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-black/[.02] p-2 dark:bg-white/[.03]">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt=""
                  className="size-12 rounded-lg object-cover"
                />
              ) : (
                <span className="grid size-12 place-items-center rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
                  <FileText size={19} />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">
                  {imageName || documentName}
                </div>
                <div className="muted mt-0.5 text-[10px]">
                  {labels.attachmentStays}
                </div>
              </div>

              <button
                onClick={removeAttachment}
                className="muted grid size-8 shrink-0 place-items-center rounded-lg hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                aria-label={labels.remove}
              >
                <X size={15} />
              </button>
            </div>
          ) : null}

          <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-2 shadow-sm focus-within:border-[var(--brand)]/50">
            <Textarea
              rows={1}
              value={input}
              disabled={busy}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onComposerKeyDown}
              onInput={(event) => {
                event.currentTarget.style.height = 'auto';
                event.currentTarget.style.height = `${Math.min(
                  event.currentTarget.scrollHeight,
                  160,
                )}px`;
              }}
              placeholder={labels.placeholder}
              className="min-h-12 max-h-40 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            />

            <div className="flex items-end justify-between gap-2 px-1 pb-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAttachOpen((value) => !value)}
                  className="muted grid size-9 place-items-center rounded-xl transition hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
                  aria-label={labels.attach}
                >
                  <Plus size={19} />
                </button>

                {attachOpen ? (
                  <div className="surface absolute bottom-11 start-0 z-20 min-w-44 rounded-xl p-1.5 shadow-xl">
                    {isImage ? (
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                      >
                        <ImageIcon size={16} />
                        {labels.image}
                      </button>
                    ) : null}

                    <button
                      onClick={() => documentInputRef.current?.click()}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                    >
                      <FileText size={16} />
                      {labels.file}
                    </button>
                  </div>
                ) : null}
              </div>

              <Button
                onClick={() => void send()}
                disabled={
                  busy ||
                  (!input.trim() && !(isImage && image))
                }
                className="size-10 shrink-0 rounded-xl p-0"
                aria-label={labels.send}
              >
                <Send size={17} />
              </Button>
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={chooseImage}
            className="hidden"
          />

          <input
            ref={documentInputRef}
            type="file"
            accept=".txt,.md,.csv,.json,.html,.xml,.js,.jsx,.ts,.tsx,.css,.py,.java,.c,.cpp,.sql,.log,text/*,application/json"
            onChange={chooseDocument}
            className="hidden"
          />
        </div>
      </div>
    </section>
  );
}

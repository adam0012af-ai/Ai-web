'use client';

import type {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
} from 'react';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  BookmarkPlus,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Library,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import {
  aiTools,
  localizeTool,
} from '@/data/ai-tools';

import {
  getWorkspaceModes,
  getWorkspacePresets,
} from '@/data/ai-workspace-presets';

import type { AppLocale } from '@/lib/i18n';

import {
  createVoiceRecognition,
  isVoiceInputSupported,
  speakText,
  stopSpeaking,
  type SpeechRecognitionLike,
} from '@/lib/browser/voice';

import { MarkdownMessage } from './markdown-message';
import { rememberTool } from './recent-tools';

type ImagePayload = {
  mimeType:
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp';
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

type StoredSession = {
  messages: WorkspaceMessage[];
  modeId?: string;
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
  const router = useRouter();
  const ar = locale === 'ar';
  const isImage = slug === 'image';

  const modes = useMemo(
    () => getWorkspaceModes(slug, locale),
    [slug, locale],
  );

  const presets = useMemo(
    () => getWorkspacePresets(slug, locale),
    [slug, locale],
  );

  const [messages, setMessages] =
    useState<WorkspaceMessage[]>([]);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const [attachOpen, setAttachOpen] =
    useState(false);

  const [libraryOpen, setLibraryOpen] =
    useState(false);

  const [focusMode, setFocusMode] =
    useState(false);

  const [dragActive, setDragActive] =
    useState(false);

  const [online, setOnline] =
    useState(true);

  const [hydrated, setHydrated] =
    useState(false);

  const [voiceSupported, setVoiceSupported] =
    useState(false);

  const [listening, setListening] =
    useState(false);

  const [speakingId, setSpeakingId] =
    useState('');

  const [modeId, setModeId] =
    useState(
      modes[0]?.id ?? 'balanced',
    );

  const [savedPrompts, setSavedPrompts] =
    useState<string[]>([]);

  const [image, setImage] =
    useState<ImagePayload | null>(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState('');

  const [imageName, setImageName] =
    useState('');

  const [
    documentName,
    setDocumentName,
  ] = useState('');

  const [
    documentText,
    setDocumentText,
  ] = useState('');

  const bottomRef =
    useRef<HTMLDivElement | null>(null);

  const imageInputRef =
    useRef<HTMLInputElement | null>(null);

  const documentInputRef =
    useRef<HTMLInputElement | null>(null);

  const abortRef =
    useRef<AbortController | null>(null);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(
      null,
    );

  const sessionKey =
    `nexa-tool-session-v4:${slug}:${locale}`;

  const draftKey =
    `nexa-tool-draft-v4:${slug}:${locale}`;

  const promptKey =
    `nexa-saved-prompts-v4:${slug}:${locale}`;

  const labels = useMemo(
    () =>
      ar
        ? {
            welcome: `ابدأ مع ${title}`,
            subtitle:
              'اكتب وارسل من نفس المكان، وكمل بأسئلة متابعة. المحادثة والمسودة تُحفظ محليًا على جهازك.',
            placeholder:
              'اكتب رسالتك…',
            generating:
              'جاري التفكير…',
            clear:
              'محادثة جديدة',
            attach: 'إرفاق',
            image: 'صورة',
            file: 'ملف نصي',
            remove:
              'إزالة المرفق',
            copy: 'نسخ',
            copied: 'تم النسخ',
            regenerate:
              'إعادة الرد',
            download: 'تنزيل',
            share: 'مشاركة',
            fallback:
              'تم استخدام مسار احتياطي',
            cached:
              'نتيجة محفوظة',
            imageTooLarge:
              'الصورة أكبر من 2.5 MB.',
            fileTooLarge:
              'الملف أكبر من 1 MB.',
            badImage:
              'استخدم JPG أو PNG أو WEBP.',
            readError:
              'تعذر قراءة الملف.',
            chooseImage:
              'اختر صورة أولًا.',
            attachmentStays:
              'المرفق يظل ضمن السياق حتى تقوم بإزالته.',
            library:
              'مكتبة الأوامر',
            saved:
              'أوامري المحفوظة',
            savePrompt:
              'حفظ الأمر الحالي',
            stop: 'إيقاف',
            focus:
              'وضع التركيز',
            exitFocus:
              'الخروج من وضع التركيز',
            listening:
              'أستمع…',
            read:
              'قراءة الرد',
            stopReading:
              'إيقاف القراءة',
            localSaved:
              'محفوظ محليًا',
            offline:
              'أنت غير متصل بالإنترنت',
            online: 'متصل',
            drop:
              'أفلت الملف هنا',
            noSaved:
              'لم تحفظ أوامر بعد.',
          }
        : {
            welcome:
              `Start with ${title}`,
            subtitle:
              'Write, send, and continue with follow-ups. Your conversation and draft are saved locally on this device.',
            placeholder:
              'Message AI…',
            generating:
              'Thinking…',
            clear:
              'New conversation',
            attach: 'Attach',
            image: 'Image',
            file: 'Text file',
            remove:
              'Remove attachment',
            copy: 'Copy',
            copied: 'Copied',
            regenerate:
              'Regenerate',
            download:
              'Download',
            share: 'Share',
            fallback:
              'Fallback route used',
            cached:
              'Cached result',
            imageTooLarge:
              'The image is larger than 2.5 MB.',
            fileTooLarge:
              'The file is larger than 1 MB.',
            badImage:
              'Use JPG, PNG, or WEBP.',
            readError:
              'Unable to read the file.',
            chooseImage:
              'Choose an image first.',
            attachmentStays:
              'The attachment stays in context until you remove it.',
            library:
              'Prompt library',
            saved:
              'Saved prompts',
            savePrompt:
              'Save current prompt',
            stop: 'Stop',
            focus:
              'Focus mode',
            exitFocus:
              'Exit focus mode',
            listening:
              'Listening…',
            read:
              'Read response',
            stopReading:
              'Stop reading',
            localSaved:
              'Saved locally',
            offline:
              'You are offline',
            online: 'Online',
            drop:
              'Drop the file here',
            noSaved:
              'No saved prompts yet.',
          },
    [ar, title],
  );

  useEffect(() => {
    rememberTool(slug);

    setVoiceSupported(
      isVoiceInputSupported(),
    );

    setOnline(navigator.onLine);

    const onlineHandler = () =>
      setOnline(true);

    const offlineHandler = () =>
      setOnline(false);

    window.addEventListener(
      'online',
      onlineHandler,
    );

    window.addEventListener(
      'offline',
      offlineHandler,
    );

    try {
      const stored = JSON.parse(
        localStorage.getItem(
          sessionKey,
        ) ?? 'null',
      ) as StoredSession | null;

      if (
        stored?.messages?.length
      ) {
        setMessages(
          stored.messages.slice(-20),
        );
      }

      if (
        stored?.modeId &&
        modes.some(
          (mode) =>
            mode.id ===
            stored.modeId,
        )
      ) {
        setModeId(
          stored.modeId,
        );
      }

      setInput(
        localStorage.getItem(
          draftKey,
        ) ?? '',
      );

      const storedPrompts =
        JSON.parse(
          localStorage.getItem(
            promptKey,
          ) ?? '[]',
        ) as string[];

      setSavedPrompts(
        storedPrompts
          .filter(
            (item) =>
              typeof item ===
              'string',
          )
          .slice(0, 12),
      );
    } catch {}

    setHydrated(true);

    return () => {
      window.removeEventListener(
        'online',
        onlineHandler,
      );

      window.removeEventListener(
        'offline',
        offlineHandler,
      );

      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const compact =
      messages
        .slice(-20)
        .map((message) => ({
          ...message,
          content:
            message.content.slice(
              0,
              10000,
            ),
        }));

    localStorage.setItem(
      sessionKey,
      JSON.stringify({
        messages: compact,
        modeId,
      }),
    );
  }, [
    messages,
    modeId,
    hydrated,
    sessionKey,
  ]);

  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem(
      draftKey,
      input.slice(0, 30000),
    );
  }, [
    input,
    hydrated,
    draftKey,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, busy]);

  useEffect(() => {
    document.body.style.overflow =
      focusMode ? 'hidden' : '';

    return () => {
      document.body.style.overflow =
        '';
    };
  }, [focusMode]);

  useEffect(() => {
    const keyboard = (
      event: globalThis.KeyboardEvent,
    ) => {
      if (
        event.altKey &&
        event.key.toLowerCase() ===
          'n'
      ) {
        event.preventDefault();
        clearConversation();
      }

      if (
        event.altKey &&
        event.key.toLowerCase() ===
          'f'
      ) {
        event.preventDefault();
        setFocusMode(
          (value) => !value,
        );
      }

      if (
        event.key === 'Escape'
      ) {
        if (busy) {
          abortRef.current?.abort();
        } else {
          setAttachOpen(false);
          setLibraryOpen(false);

          if (focusMode) {
            setFocusMode(false);
          }
        }
      }
    };

    window.addEventListener(
      'keydown',
      keyboard,
    );

    return () =>
      window.removeEventListener(
        'keydown',
        keyboard,
      );
  }, [busy, focusMode]);

  async function getCsrf() {
    const response = await fetch(
      '/api/csrf',
      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(
        ar
          ? 'تعذر بدء طلب آمن.'
          : 'Unable to start a secure request.',
      );
    }

    const data =
      await response.json();

    if (!data?.token) {
      throw new Error(
        ar
          ? 'رمز الحماية غير متوفر.'
          : 'Security token is missing.',
      );
    }

    return data.token as string;
  }

  function currentAttachmentLabel() {
    return (
      imageName ||
      documentName ||
      undefined
    );
  }

  function buildRequestInput(
    text: string,
  ) {
    const mode =
      modes.find(
        (item) =>
          item.id === modeId,
      ) ?? modes[0];

    const modeBlock =
      mode
        ? `[Workspace mode]\n${mode.instruction}\n\n`
        : '';

    const documentBlock =
      documentText
        ? `\n\n--- Attached document: ${documentName || 'document'} ---\n${documentText}`
        : '';

    return `${modeBlock}User request:\n${text}${documentBlock}`;
  }

  function buildHistory(
    source: WorkspaceMessage[],
  ) {
    return source
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content:
          message.content.slice(
            0,
            12000,
          ),
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
    if (busy || !online) return;

    const displayText =
      text.trim();

    if (!displayText) return;

    if (isImage && !image) {
      setError(
        labels.chooseImage,
      );
      return;
    }

    setBusy(true);
    setError('');
    setAttachOpen(false);
    setLibraryOpen(false);

    const userMessage: WorkspaceMessage =
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: displayText,
        attachmentLabel:
          currentAttachmentLabel(),
      };

    if (appendUser) {
      setMessages(
        (current) => [
          ...current,
          userMessage,
        ],
      );
    }

    const controller =
      new AbortController();

    abortRef.current =
      controller;

    try {
      const token =
        await getCsrf();

      const response =
        await fetch(
          '/api/ai/generate',
          {
            method: 'POST',
            signal:
              controller.signal,
            headers: {
              'content-type':
                'application/json',
              'x-csrf-token':
                token,
            },
            body: JSON.stringify({
              feature: slug,
              input:
                buildRequestInput(
                  displayText,
                ),
              images: image
                ? [image]
                : undefined,
              history:
                buildHistory(
                  historySource,
                ),
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            (ar
              ? 'تعذر تنفيذ الطلب.'
              : 'Unable to complete the request.'),
        );
      }

      const assistantMessage: WorkspaceMessage =
        {
          id:
            replaceAssistantId ??
            `assistant-${Date.now()}`,
          role: 'assistant',
          content: String(
            data.text ?? '',
          ),
          fallbackUsed:
            Boolean(
              data.fallbackUsed,
            ),
          cached:
            Boolean(
              data.cached,
            ),
          latency:
            typeof data.latency ===
            'number'
              ? data.latency
              : undefined,
        };

      setMessages((current) => {
        if (
          replaceAssistantId
        ) {
          return current.map(
            (message) =>
              message.id ===
              replaceAssistantId
                ? assistantMessage
                : message,
          );
        }

        return [
          ...current,
          assistantMessage,
        ];
      });

      if (appendUser) {
        setInput('');
      }
    } catch (cause) {
      if (
        cause instanceof
          DOMException &&
        cause.name ===
          'AbortError'
      ) {
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : ar
            ? 'تعذر تنفيذ الطلب.'
            : 'Unable to complete the request.',
      );
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function send() {
    let text =
      input.trim();

    if (
      !text &&
      isImage &&
      image
    ) {
      text = ar
        ? 'حلّل هذه الصورة بدقة، واذكر فقط ما يمكنك تأكيده من الصورة نفسها.'
        : 'Analyze this image carefully and state only what can be supported by the image itself.';
    }

    if (!text) return;

    await requestResponse({
      text,
      historySource:
        [...messages],
      appendUser: true,
    });
  }

  async function regenerate(
    assistantId: string,
  ) {
    const assistantIndex =
      messages.findIndex(
        (message) =>
          message.id ===
          assistantId,
      );

    if (assistantIndex < 0) {
      return;
    }

    let userIndex =
      assistantIndex - 1;

    while (
      userIndex >= 0 &&
      messages[userIndex]?.role !==
        'user'
    ) {
      userIndex--;
    }

    const userMessage =
      messages[userIndex];

    if (
      !userMessage ||
      userMessage.role !== 'user'
    ) {
      return;
    }

    await requestResponse({
      text:
        userMessage.content,
      historySource:
        messages.slice(
          0,
          userIndex,
        ),
      replaceAssistantId:
        assistantId,
      appendUser: false,
    });
  }

  function clearConversation() {
    abortRef.current?.abort();

    recognitionRef.current?.abort();

    stopSpeaking();

    setMessages([]);
    setInput('');
    setError('');
    setImage(null);
    setImagePreview('');
    setImageName('');
    setDocumentName('');
    setDocumentText('');
    setSpeakingId('');
    setListening(false);

    localStorage.removeItem(
      sessionKey,
    );

    localStorage.removeItem(
      draftKey,
    );
  }

  function removeAttachment() {
    setImage(null);
    setImagePreview('');
    setImageName('');
    setDocumentName('');
    setDocumentText('');
    setError('');
  }

  async function loadImageFile(
    file: File,
  ) {
    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(file.type)
    ) {
      setError(
        labels.badImage,
      );
      return;
    }

    if (
      file.size >
      2.5 * 1024 * 1024
    ) {
      setError(
        labels.imageTooLarge,
      );
      return;
    }

    try {
      const dataUrl =
        await new Promise<string>(
          (resolve, reject) => {
            const reader =
              new FileReader();

            reader.onload = () =>
              resolve(
                String(
                  reader.result ?? '',
                ),
              );

            reader.onerror = () =>
              reject(
                new Error(
                  labels.readError,
                ),
              );

            reader.readAsDataURL(
              file,
            );
          },
        );

      const data =
        dataUrl.split(',')[1] ??
        '';

      setImage({
        mimeType:
          file.type as ImagePayload['mimeType'],
        data,
      });

      setImagePreview(dataUrl);

      setImageName(
        file.name ||
          'clipboard-image',
      );

      setDocumentName('');
      setDocumentText('');
      setError('');
    } catch {
      setError(
        labels.readError,
      );
    }
  }

  async function loadDocumentFile(
    file: File,
  ) {
    if (
      file.size >
      1024 * 1024
    ) {
      setError(
        labels.fileTooLarge,
      );
      return;
    }

    try {
      const text =
        await file.text();

      setDocumentText(
        text.slice(
          0,
          22000,
        ),
      );

      setDocumentName(
        file.name,
      );

      setImage(null);
      setImagePreview('');
      setImageName('');
      setError('');
    } catch {
      setError(
        labels.readError,
      );
    }
  }

  async function chooseImage(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (file) {
      await loadImageFile(
        file,
      );
    }

    event.target.value = '';
    setAttachOpen(false);
  }

  async function chooseDocument(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (file) {
      await loadDocumentFile(
        file,
      );
    }

    event.target.value = '';
    setAttachOpen(false);
  }

  async function handleDrop(
    event: DragEvent<HTMLElement>,
  ) {
    event.preventDefault();
    setDragActive(false);

    const file =
      event.dataTransfer.files?.[0];

    if (!file) return;

    if (
      file.type.startsWith(
        'image/',
      )
    ) {
      if (!isImage) {
        setError(
          ar
            ? 'لتحليل الصور افتح أداة محلل الصور.'
            : 'Open Image Analyzer to attach images.',
        );
        return;
      }

      await loadImageFile(
        file,
      );
      return;
    }

    await loadDocumentFile(
      file,
    );
  }

  async function handlePaste(
    event:
      ClipboardEvent<HTMLTextAreaElement>,
  ) {
    if (!isImage) return;

    const items =
      Array.from(
        event.clipboardData.items,
      );

    const imageItem =
      items.find((item) =>
        item.type.startsWith(
          'image/',
        ),
      );

    const file =
      imageItem?.getAsFile();

    if (!file) return;

    event.preventDefault();

    await loadImageFile(file);
  }

  function startVoice() {
    if (
      !voiceSupported ||
      busy
    ) {
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition =
      createVoiceRecognition(
        locale,
        {
          onText: (text) => {
            setInput(
              (current) =>
                current.trim()
                  ? `${current.trim()} ${text}`
                  : text,
            );
          },
          onEnd: () => {
            setListening(false);

            recognitionRef.current =
              null;
          },
          onError: () => {
            setListening(false);

            recognitionRef.current =
              null;
          },
        },
      );

    if (!recognition) {
      return;
    }

    recognitionRef.current =
      recognition;

    setListening(true);

    recognition.start();
  }

  function toggleSpeak(
    message: WorkspaceMessage,
  ) {
    if (
      speakingId ===
      message.id
    ) {
      stopSpeaking();
      setSpeakingId('');
      return;
    }

    stopSpeaking();

    const started =
      speakText(
        message.content,
        locale,
        () =>
          setSpeakingId(''),
      );

    if (started) {
      setSpeakingId(
        message.id,
      );
    }
  }

  async function copyMessage(
    message: WorkspaceMessage,
  ) {
    await navigator.clipboard.writeText(
      message.content,
    );

    setCopiedId(message.id);

    window.setTimeout(
      () => setCopiedId(''),
      1400,
    );
  }

  async function shareMessage(
    message: WorkspaceMessage,
  ) {
    if (navigator.share) {
      await navigator
        .share({
          title,
          text:
            message.content,
        })
        .catch(
          () => undefined,
        );

      return;
    }

    await copyMessage(
      message,
    );
  }

  function downloadMessage(
    message: WorkspaceMessage,
  ) {
    const blob = new Blob(
      [message.content],
      {
        type:
          'text/markdown;charset=utf-8',
      },
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;

    anchor.download =
      `${slug}-response.md`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function downloadConversation() {
    if (!messages.length) {
      return;
    }

    const content =
      messages
        .map(
          (message) =>
            `## ${
              message.role ===
              'user'
                ? 'User'
                : 'AI'
            }\n\n${message.content}`,
        )
        .join(
          '\n\n---\n\n',
        );

    const blob = new Blob(
      [content],
      {
        type:
          'text/markdown;charset=utf-8',
      },
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;

    anchor.download =
      `${slug}-conversation.md`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function saveCurrentPrompt() {
    const value =
      input.trim();

    if (!value) return;

    const next = [
      value,
      ...savedPrompts.filter(
        (item) =>
          item !== value,
      ),
    ].slice(0, 12);

    setSavedPrompts(next);

    localStorage.setItem(
      promptKey,
      JSON.stringify(next),
    );

    setLibraryOpen(true);
  }

  function deleteSavedPrompt(
    prompt: string,
  ) {
    const next =
      savedPrompts.filter(
        (item) =>
          item !== prompt,
      );

    setSavedPrompts(next);

    localStorage.setItem(
      promptKey,
      JSON.stringify(next),
    );
  }

  function onComposerKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void send();
    }
  }

  const currentMode =
    modes.find(
      (mode) =>
        mode.id === modeId,
    ) ?? modes[0];

  return (
    <section
      className={`surface relative flex flex-col overflow-hidden ${
        focusMode
          ? 'fixed inset-0 z-[100] min-h-[100dvh] rounded-none border-0'
          : 'min-h-[calc(100dvh-235px)] rounded-2xl'
      }`}
      dir={
        ar ? 'rtl' : 'ltr'
      }
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() =>
        setDragActive(false)
      }
      onDrop={(event) =>
        void handleDrop(event)
      }
    >
      {dragActive ? (
        <div className="pointer-events-none absolute inset-2 z-50 grid place-items-center rounded-2xl border-2 border-dashed border-[var(--brand)] bg-[var(--card)]/90 backdrop-blur">
          <div className="text-center">
            <Paperclip
              className="mx-auto text-[var(--brand)]"
              size={30}
            />
            <div className="mt-2 font-black">
              {labels.drop}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
            <Sparkles
              size={17}
            />
          </span>

          <div className="min-w-0">
            <div className="truncate text-sm font-black">
              {title}
            </div>

            <div className="muted hidden truncate text-xs sm:block">
              {description}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            className={`hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold sm:flex ${
              online
                ? 'muted'
                : 'text-red-500'
            }`}
          >
            {online ? (
              <Wifi size={12} />
            ) : (
              <WifiOff
                size={12}
              />
            )}

            {online
              ? labels.online
              : labels.offline}
          </span>

          <Button
            variant="ghost"
            className="size-9 p-0"
            onClick={
              downloadConversation
            }
            disabled={
              !messages.length
            }
            aria-label={
              labels.download
            }
          >
            <Download
              size={16}
            />
          </Button>

          <Button
            variant="ghost"
            className="size-9 p-0"
            onClick={() =>
              setFocusMode(
                (value) =>
                  !value,
              )
            }
            aria-label={
              focusMode
                ? labels.exitFocus
                : labels.focus
            }
          >
            {focusMode ? (
              <Minimize2
                size={16}
              />
            ) : (
              <Maximize2
                size={16}
              />
            )}
          </Button>

          <Button
            variant="ghost"
            className="size-9 p-0"
            onClick={
              clearConversation
            }
            aria-label={
              labels.clear
            }
          >
            <RotateCcw
              size={16}
            />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--line)] px-3 py-2 sm:px-5">
        <label className="relative">
          <select
            value={slug}
            onChange={(event) => {
              const next =
                event.target.value;

              router.push(
                next === 'chat'
                  ? '/dashboard/ai/chat'
                  : `/dashboard/ai/${next}`,
              );
            }}
            className="h-9 max-w-48 appearance-none rounded-xl border border-[var(--line)] bg-[var(--card)] pe-8 ps-3 text-xs font-bold outline-none"
          >
            {aiTools.map(
              (tool) => {
                const localized =
                  localizeTool(
                    tool,
                    locale,
                  );

                return (
                  <option
                    key={
                      tool.slug
                    }
                    value={
                      tool.slug
                    }
                  >
                    {
                      localized.displayTitle
                    }
                  </option>
                );
              },
            )}
          </select>

          <ChevronDown
            className="pointer-events-none absolute end-2 top-2.5"
            size={14}
          />
        </label>

        <label className="relative">
          <select
            value={modeId}
            onChange={(event) =>
              setModeId(
                event.target.value,
              )
            }
            className="h-9 max-w-48 appearance-none rounded-xl border border-[var(--line)] bg-[var(--card)] pe-8 ps-3 text-xs font-bold outline-none"
          >
            {modes.map(
              (mode) => (
                <option
                  key={mode.id}
                  value={mode.id}
                >
                  {mode.label}
                </option>
              ),
            )}
          </select>

          <ChevronDown
            className="pointer-events-none absolute end-2 top-2.5"
            size={14}
          />
        </label>

        <button
          onClick={() => {
            setLibraryOpen(
              (value) =>
                !value,
            );

            setAttachOpen(
              false,
            );
          }}
          className="muted flex h-9 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-xs font-bold"
        >
          <Library
            size={14}
          />

          {labels.library}
        </button>

        <span className="muted ms-auto hidden items-center text-[10px] sm:flex">
          {labels.localSaved}
        </span>
      </div>

      {libraryOpen ? (
        <div className="border-b border-[var(--line)] bg-black/[.015] p-3 dark:bg-white/[.015] sm:p-4">
          <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
            {presets.map(
              (preset) => (
                <button
                  key={
                    preset.id
                  }
                  onClick={() => {
                    setInput(
                      preset.prompt,
                    );

                    setLibraryOpen(
                      false,
                    );
                  }}
                  className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 text-start"
                >
                  <div className="text-xs font-black">
                    {
                      preset.title
                    }
                  </div>

                  <div className="muted mt-1 max-h-10 overflow-hidden text-[11px] leading-5">
                    {
                      preset.prompt
                    }
                  </div>
                </button>
              ),
            )}
          </div>

          <div className="mx-auto mt-3 max-w-3xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="muted text-xs font-bold">
                {labels.saved}
              </span>

              <button
                onClick={
                  saveCurrentPrompt
                }
                disabled={
                  !input.trim()
                }
                className="muted flex items-center gap-1 text-xs font-bold disabled:opacity-40"
              >
                <BookmarkPlus
                  size={14}
                />

                {
                  labels.savePrompt
                }
              </button>
            </div>

            {savedPrompts.length ? (
              <div className="flex flex-wrap gap-2">
                {savedPrompts.map(
                  (prompt) => (
                    <div
                      key={prompt}
                      className="flex max-w-full items-center rounded-full border border-[var(--line)] bg-[var(--card)]"
                    >
                      <button
                        onClick={() => {
                          setInput(
                            prompt,
                          );

                          setLibraryOpen(
                            false,
                          );
                        }}
                        className="max-w-64 truncate px-3 py-2 text-xs"
                      >
                        {prompt}
                      </button>

                      <button
                        onClick={() =>
                          deleteSavedPrompt(
                            prompt,
                          )
                        }
                        className="muted pe-2"
                        aria-label="Delete saved prompt"
                      >
                        <X
                          size={13}
                        />
                      </button>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="muted text-xs">
                {labels.noSaved}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-3xl">
          {!messages.length ? (
            <div className="flex min-h-[42vh] flex-col items-center justify-center text-center">
              <span className="brand-gradient grid size-14 place-items-center rounded-2xl shadow-lg">
                <Sparkles
                  size={24}
                />
              </span>

              <h2 className="mt-5 text-2xl font-black sm:text-3xl">
                {labels.welcome}
              </h2>

              <p className="muted mt-2 max-w-xl text-sm leading-7">
                {labels.subtitle}
              </p>

              {currentMode ? (
                <span className="mt-4 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--brand)]">
                  {
                    currentMode.label
                  }
                </span>
              ) : null}

              <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                {presets
                  .slice(0, 3)
                  .map(
                    (preset) => (
                      <button
                        key={
                          preset.id
                        }
                        onClick={() =>
                          setInput(
                            preset.prompt,
                          )
                        }
                        className="rounded-full border border-[var(--line)] px-3 py-2 text-sm transition hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                      >
                        {
                          preset.title
                        }
                      </button>
                    ),
                  )}
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {messages.map(
                (message) =>
                  message.role ===
                  'user' ? (
                    <div
                      key={
                        message.id
                      }
                      className="ms-auto max-w-[90%] sm:max-w-[78%]"
                    >
                      {message.attachmentLabel ? (
                        <div className="muted mb-2 flex items-center justify-end gap-1.5 text-xs">
                          <Paperclip
                            size={
                              13
                            }
                          />

                          <span className="max-w-60 truncate">
                            {
                              message.attachmentLabel
                            }
                          </span>
                        </div>
                      ) : null}

                      <div
                        className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm leading-7 text-white"
                        dir="auto"
                      >
                        {
                          message.content
                        }
                      </div>
                    </div>
                  ) : (
                    <article
                      key={
                        message.id
                      }
                      className="group max-w-full"
                    >
                      <div className="flex items-start gap-3">
                        <span className="brand-gradient mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black">
                          AI
                        </span>

                        <div className="min-w-0 flex-1">
                          <MarkdownMessage
                            content={
                              message.content
                            }
                          />

                          <div className="mt-3 flex flex-wrap items-center gap-1">
                            <Button
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() =>
                                void copyMessage(
                                  message,
                                )
                              }
                            >
                              {copiedId ===
                              message.id ? (
                                <Check
                                  size={
                                    14
                                  }
                                />
                              ) : (
                                <Copy
                                  size={
                                    14
                                  }
                                />
                              )}

                              {copiedId ===
                              message.id
                                ? labels.copied
                                : labels.copy}
                            </Button>

                            <Button
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void regenerate(
                                  message.id,
                                )
                              }
                            >
                              <RefreshCw
                                size={
                                  14
                                }
                              />

                              {
                                labels.regenerate
                              }
                            </Button>

                            <Button
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() =>
                                toggleSpeak(
                                  message,
                                )
                              }
                            >
                              {speakingId ===
                              message.id ? (
                                <VolumeX
                                  size={
                                    14
                                  }
                                />
                              ) : (
                                <Volume2
                                  size={
                                    14
                                  }
                                />
                              )}

                              <span className="hidden sm:inline">
                                {speakingId ===
                                message.id
                                  ? labels.stopReading
                                  : labels.read}
                              </span>
                            </Button>

                            <Button
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() =>
                                void shareMessage(
                                  message,
                                )
                              }
                            >
                              <Share2
                                size={
                                  14
                                }
                              />

                              <span className="hidden sm:inline">
                                {
                                  labels.share
                                }
                              </span>
                            </Button>

                            <Button
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() =>
                                downloadMessage(
                                  message,
                                )
                              }
                            >
                              <Download
                                size={
                                  14
                                }
                              />
                            </Button>

                            {message.latency ? (
                              <span className="muted text-[10px]">
                                {(
                                  message.latency /
                                  1000
                                ).toFixed(
                                  1,
                                )}
                                s
                              </span>
                            ) : null}

                            {message.fallbackUsed ? (
                              <span className="muted rounded-full border border-[var(--line)] px-2 py-1 text-[10px]">
                                {
                                  labels.fallback
                                }
                              </span>
                            ) : null}

                            {message.cached ? (
                              <span className="muted rounded-full border border-[var(--line)] px-2 py-1 text-[10px]">
                                {
                                  labels.cached
                                }
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

                    {
                      labels.generating
                    }
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

      {!online ? (
        <div className="mx-3 mb-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm sm:mx-5">
          <WifiOff
            className="me-2 inline"
            size={15}
          />
          {labels.offline}
        </div>
      ) : null}

      <div className="sticky bottom-0 border-t border-[var(--line)] bg-[var(--card)]/95 p-3 backdrop-blur-xl sm:p-4">
        <div className="mx-auto max-w-3xl">
          {imagePreview ||
          documentName ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-black/[.02] p-2 dark:bg-white/[.03]">
              {imagePreview ? (
                <img
                  src={
                    imagePreview
                  }
                  alt=""
                  className="size-12 rounded-lg object-cover"
                />
              ) : (
                <span className="grid size-12 place-items-center rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
                  <FileText
                    size={19}
                  />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">
                  {imageName ||
                    documentName}
                </div>

                <div className="muted mt-0.5 text-[10px]">
                  {
                    labels.attachmentStays
                  }
                </div>
              </div>

              <button
                onClick={
                  removeAttachment
                }
                className="muted grid size-8 shrink-0 place-items-center rounded-lg hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                aria-label={
                  labels.remove
                }
              >
                <X
                  size={15}
                />
              </button>
            </div>
          ) : null}

          <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-2 shadow-sm focus-within:border-[var(--brand)]/50">
            <Textarea
              rows={1}
              value={input}
              disabled={busy}
              onChange={(event) =>
                setInput(
                  event.target.value,
                )
              }
              onKeyDown={
                onComposerKeyDown
              }
              onPaste={(event) =>
                void handlePaste(
                  event,
                )
              }
              onInput={(event) => {
                event.currentTarget.style.height =
                  'auto';

                event.currentTarget.style.height =
                  `${Math.min(
                    event.currentTarget
                      .scrollHeight,
                    160,
                  )}px`;
              }}
              placeholder={
                listening
                  ? labels.listening
                  : labels.placeholder
              }
              className="min-h-12 max-h-40 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            />

            <div className="flex items-end justify-between gap-2 px-1 pb-1">
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachOpen(
                        (value) =>
                          !value,
                      );

                      setLibraryOpen(
                        false,
                      );
                    }}
                    className="muted grid size-9 place-items-center rounded-xl transition hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]"
                    aria-label={
                      labels.attach
                    }
                  >
                    <Plus
                      size={19}
                    />
                  </button>

                  {attachOpen ? (
                    <div className="surface absolute bottom-11 start-0 z-20 min-w-44 rounded-xl p-1.5 shadow-xl">
                      {isImage ? (
                        <button
                          onClick={() =>
                            imageInputRef.current?.click()
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                        >
                          <ImageIcon
                            size={
                              16
                            }
                          />
                          {
                            labels.image
                          }
                        </button>
                      ) : null}

                      <button
                        onClick={() =>
                          documentInputRef.current?.click()
                        }
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"
                      >
                        <FileText
                          size={
                            16
                          }
                        />

                        {
                          labels.file
                        }
                      </button>
                    </div>
                  ) : null}
                </div>

                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={
                      startVoice
                    }
                    disabled={
                      busy
                    }
                    className={`grid size-9 place-items-center rounded-xl transition ${
                      listening
                        ? 'bg-red-500/10 text-red-500'
                        : 'muted hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]'
                    }`}
                    aria-label={
                      labels.listening
                    }
                  >
                    {listening ? (
                      <MicOff
                        size={
                          18
                        }
                      />
                    ) : (
                      <Mic
                        size={
                          18
                        }
                      />
                    )}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={
                    saveCurrentPrompt
                  }
                  disabled={
                    !input.trim()
                  }
                  className="muted hidden size-9 place-items-center rounded-xl transition hover:bg-black/[.04] hover:text-[var(--fg)] disabled:opacity-30 dark:hover:bg-white/[.05] sm:grid"
                  aria-label={
                    labels.savePrompt
                  }
                >
                  <BookmarkPlus
                    size={17}
                  />
                </button>
              </div>

              {busy ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    abortRef.current?.abort()
                  }
                  className="size-10 shrink-0 rounded-xl p-0"
                  aria-label={
                    labels.stop
                  }
                >
                  <Square
                    size={
                      16
                    }
                  />
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    void send()
                  }
                  disabled={
                    !online ||
                    (!input.trim() &&
                      !(
                        isImage &&
                        image
                      ))
                  }
                  className="size-10 shrink-0 rounded-xl p-0"
                  aria-label="Send"
                >
                  <Send
                    size={17}
                  />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={
          chooseImage
        }
        className="hidden"
      />

      <input
        ref={documentInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.html,.xml,.js,.jsx,.ts,.tsx,.css,.py,.java,.c,.cpp,.sql,.log,text/*,application/json"
        onChange={
          chooseDocument
        }
        className="hidden"
      />
    </section>
  );
}

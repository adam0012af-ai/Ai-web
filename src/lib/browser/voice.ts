export type VoiceLocale = 'ar' | 'en';

type RecognitionResultLike = {
  0?: { transcript?: string };
};

type RecognitionEventLike = {
  results: {
    length: number;
    [index: number]: RecognitionResultLike;
  };
};

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type VoiceWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

function voiceWindow() {
  if (typeof window === 'undefined') return null;
  return window as VoiceWindow;
}

export function isVoiceInputSupported() {
  const target = voiceWindow();
  return Boolean(target?.SpeechRecognition ?? target?.webkitSpeechRecognition);
}

export function createVoiceRecognition(
  locale: VoiceLocale,
  handlers: {
    onText: (text: string) => void;
    onEnd: () => void;
    onError: () => void;
  },
) {
  const target = voiceWindow();
  const Constructor =
    target?.SpeechRecognition ?? target?.webkitSpeechRecognition;

  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.lang = locale === 'ar' ? 'ar-EG' : 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const text = last?.[0]?.transcript?.trim();
    if (text) handlers.onText(text);
  };

  recognition.onend = handlers.onEnd;
  recognition.onerror = handlers.onError;

  return recognition;
}

export function plainSpeechText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_#>|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speakText(
  text: string,
  locale: VoiceLocale,
  onEnd?: () => void,
  rate = 1,
) {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(plainSpeechText(text));
  utterance.lang = locale === 'ar' ? 'ar-EG' : 'en-US';
  utterance.rate = Math.min(1.5, Math.max(0.7, rate));
  utterance.pitch = 1;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window
  ) {
    window.speechSynthesis.cancel();
  }
}

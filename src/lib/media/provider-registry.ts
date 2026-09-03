export type MediaCapability =
  | 'IMAGE_GENERATION'
  | 'IMAGE_EDIT'
  | 'VIDEO_GENERATION'
  | 'VIDEO_EDIT'
  | 'AUDIO_TRANSCRIBE'
  | 'AI_TTS'
  | 'MEDIA_STORAGE';

export type MediaProviderSlot = {
  capability: MediaCapability;
  connected: boolean;
  provider: string | null;
  model: string | null;
};

export const mediaProviderSlots: MediaProviderSlot[] = [
  { capability: 'IMAGE_GENERATION', connected: false, provider: null, model: null },
  { capability: 'IMAGE_EDIT', connected: false, provider: null, model: null },
  { capability: 'VIDEO_GENERATION', connected: false, provider: null, model: null },
  { capability: 'VIDEO_EDIT', connected: false, provider: null, model: null },
  { capability: 'AUDIO_TRANSCRIBE', connected: false, provider: null, model: null },
  { capability: 'AI_TTS', connected: false, provider: null, model: null },
  { capability: 'MEDIA_STORAGE', connected: false, provider: null, model: null },
];

export function mediaCapabilityConnected(capability: MediaCapability) {
  return mediaProviderSlots.some(
    (slot) => slot.capability === capability && slot.connected,
  );
}

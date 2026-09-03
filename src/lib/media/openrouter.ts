type OpenRouterModel = {
  id: string;
  name?: string;
  supported_parameters?: string[];
  supported_durations?: number[];
  supported_resolutions?: string[];
  supported_aspect_ratios?: string[];
  supports_audio?: boolean;
  supports_generate_audio?: boolean;
  supported_frame_images?: string[] | number | boolean;
};

type ImageOutput = {
  b64_json?: string;
  media_type?: string;
  revised_prompt?: string;
};

export type ImageGenerationResult = {
  images: { b64: string; mediaType: string; revisedPrompt?: string }[];
  model: string;
  cost?: number;
};

export type VideoGenerationJob = {
  id: string;
  status: string;
  polling_url?: string;
  generation_id?: string;
  unsigned_urls?: string[];
  error?: string | { message?: string };
  usage?: { cost?: number };
};

const BASE_URL = 'https://openrouter.ai/api/v1';
const CACHE_MS = 5 * 60 * 1000;

let imageModelsCache: { at: number; data: OpenRouterModel[] } | null = null;
let videoModelsCache: { at: number; data: OpenRouterModel[] } | null = null;

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error('OpenRouter is not configured for this Nexa deployment.');
  return key;
}

function appUrl() {
  return (
    process.env.OPENROUTER_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  );
}

function headers(json = true) {
  return {
    ...(json ? { 'content-type': 'application/json' } : {}),
    authorization: `Bearer ${apiKey()}`,
    'HTTP-Referer': appUrl(),
    'X-Title': process.env.OPENROUTER_APP_NAME ?? 'Nexa AI',
  };
}

async function openrouter(path: string, init: RequestInit = {}, timeoutMs = 60_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...headers(init.body !== undefined),
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let message = body.slice(0, 500);

      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
        message =
          typeof parsed.error === 'string'
            ? parsed.error
            : parsed.error?.message ?? parsed.message ?? message;
      } catch {}

      throw new Error(`OpenRouter ${response.status}: ${message || response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function listModels(kind: 'image' | 'video') {
  const cache = kind === 'image' ? imageModelsCache : videoModelsCache;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const response = await openrouter(`/${kind === 'image' ? 'images' : 'videos'}/models`, {}, 20_000);
  const body = (await response.json()) as { data?: OpenRouterModel[] } | OpenRouterModel[];
  const data = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];

  if (kind === 'image') imageModelsCache = { at: Date.now(), data };
  else videoModelsCache = { at: Date.now(), data };

  return data;
}

function chooseModel(
  models: OpenRouterModel[],
  preferences: string[],
  requirements?: (model: OpenRouterModel) => boolean,
) {
  const compatible = requirements ? models.filter(requirements) : models;

  for (const id of preferences) {
    const exact = compatible.find((model) => model.id === id);
    if (exact) return exact;
  }

  return compatible[0] ?? models[0] ?? null;
}

export async function resolveImageModel(mode: 'fast' | 'balanced' | 'quality' = 'balanced') {
  const models = await listModels('image').catch(() => [] as OpenRouterModel[]);
  const preferences =
    mode === 'fast'
      ? [
          'google/gemini-3.1-flash-image',
          'google/gemini-2.5-flash-image',
          'bytedance-seed/seedream-4.5',
          'openai/gpt-image-2',
        ]
      : mode === 'quality'
        ? [
            'openai/gpt-image-2',
            'bytedance-seed/seedream-4.5',
            'google/gemini-3.1-flash-image',
          ]
        : [
            'google/gemini-3.1-flash-image',
            'bytedance-seed/seedream-4.5',
            'openai/gpt-image-2',
          ];

  return chooseModel(models, preferences)?.id ?? preferences[0];
}

export async function generateImage(input: {
  prompt: string;
  aspectRatio: string;
  resolution: '512' | '1K' | '2K' | '4K';
  quality: 'auto' | 'low' | 'medium' | 'high';
  mode?: 'fast' | 'balanced' | 'quality';
  outputFormat?: 'png' | 'jpeg' | 'webp';
  reference?: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string };
}) {
  const model = await resolveImageModel(input.mode);
  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    n: 1,
    aspect_ratio: input.aspectRatio,
    resolution: input.resolution,
    quality: input.quality,
    output_format: input.outputFormat ?? 'png',
  };

  if (input.reference) {
    body.input_references = [
      {
        type: 'image_url',
        image_url: {
          url: `data:${input.reference.mimeType};base64,${input.reference.data}`,
        },
      },
    ];
  }

  const response = await openrouter('/images', {
    method: 'POST',
    body: JSON.stringify(body),
  }, 120_000);
  const result = (await response.json()) as {
    data?: ImageOutput[];
    usage?: { cost?: number };
  };

  const images = (result.data ?? [])
    .filter((item) => typeof item.b64_json === 'string' && item.b64_json.length > 50)
    .map((item) => ({
      b64: item.b64_json as string,
      mediaType: item.media_type || 'image/png',
      revisedPrompt: item.revised_prompt,
    }));

  if (!images.length) throw new Error('OpenRouter completed the request but returned no image data.');

  return {
    images,
    model,
    cost: typeof result.usage?.cost === 'number' ? result.usage.cost : undefined,
  } satisfies ImageGenerationResult;
}

function supportsVideoValue(model: OpenRouterModel, field: 'duration' | 'resolution' | 'aspectRatio', value: number | string) {
  if (field === 'duration') {
    return !model.supported_durations?.length || model.supported_durations.includes(Number(value));
  }
  if (field === 'resolution') {
    return !model.supported_resolutions?.length || model.supported_resolutions.includes(String(value));
  }
  return !model.supported_aspect_ratios?.length || model.supported_aspect_ratios.includes(String(value));
}

export async function resolveVideoModel(input: {
  mode?: 'fast' | 'balanced' | 'quality';
  duration: number;
  resolution: string;
  aspectRatio: string;
}) {
  const models = await listModels('video').catch(() => [] as OpenRouterModel[]);
  const preferences =
    input.mode === 'quality'
      ? ['google/veo-3.1', 'openai/sora-2-pro', 'bytedance/seedance-2.0']
      : input.mode === 'fast'
        ? ['google/veo-3.1-lite', 'google/veo-3.1-fast', 'bytedance/seedance-2.0-fast']
        : ['google/veo-3.1-lite', 'google/veo-3.1', 'bytedance/seedance-2.0'];

  const selected = chooseModel(
    models,
    preferences,
    (model) =>
      supportsVideoValue(model, 'duration', input.duration) &&
      supportsVideoValue(model, 'resolution', input.resolution) &&
      supportsVideoValue(model, 'aspectRatio', input.aspectRatio),
  );

  return selected?.id ?? preferences[0];
}

export async function submitVideo(input: {
  prompt: string;
  duration: number;
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16';
  generateAudio: boolean;
  mode?: 'fast' | 'balanced' | 'quality';
}) {
  const model = await resolveVideoModel(input);
  const response = await openrouter('/videos', {
    method: 'POST',
    body: JSON.stringify({
      model,
      prompt: input.prompt,
      duration: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      generate_audio: input.generateAudio,
    }),
  }, 60_000);

  const job = (await response.json()) as VideoGenerationJob;
  if (!job.id) throw new Error('OpenRouter did not return a video job ID.');

  return { job, model };
}

export async function getVideoJob(id: string) {
  if (!/^job-[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid external video job ID.');
  const response = await openrouter(`/videos/${encodeURIComponent(id)}`, {}, 30_000);
  return (await response.json()) as VideoGenerationJob;
}

export async function getVideoContent(id: string, index = 0) {
  if (!/^job-[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid external video job ID.');
  return openrouter(`/videos/${encodeURIComponent(id)}/content?index=${Math.max(0, Math.min(4, index))}`, {}, 120_000);
}

export async function getAvailableMediaModels(kind: 'image' | 'video') {
  return listModels(kind);
}

import { db } from '@/lib/db';
import type { AIProvider } from '@/generated/prisma/client';
import type { AIRequest, AIResponse, AIProviderClient } from './types';
import { aiRuntimeConfig, defaultProviders } from './config';
import { normalizeProviderError, AIProviderError } from './errors';
import { geminiProvider } from './providers/gemini';
import { openrouterProvider } from './providers/openrouter';
import { cloudflareProvider } from './providers/cloudflare';
import { recordFailure, recordSuccess } from './health';
import { cacheKey, getCached, setCached } from './cache';

const clients: Record<AIProvider, AIProviderClient> = {
  GEMINI: geminiProvider,
  OPENROUTER: openrouterProvider,
  CLOUDFLARE: cloudflareProvider,
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function providerRows(feature: string) {
  const rows = await db.aIProviderConfig.findMany({
    where: { enabled: true },
    orderBy: { priority: 'asc' },
  });

  if (!rows.length) {
    return defaultProviders.map((provider) => ({
      ...provider,
      cooldownUntil: null,
      status: 'HEALTHY' as const,
    }));
  }

  const models = await db.aIModel.findMany({
    where: {
      enabled: true,
      OR: [{ feature }, { feature: null }],
    },
    orderBy: [{ priority: 'asc' }, { isDefault: 'desc' }],
  });

  return rows.map((row) => {
    const featureModel = models.find(
      (model) =>
        model.provider === row.provider && model.feature === feature,
    );

    const generic =
      models.find(
        (model) =>
          model.provider === row.provider &&
          model.feature === null &&
          model.isDefault,
      ) ??
      models.find(
        (model) =>
          model.provider === row.provider && model.feature === null,
      );

    return {
      provider: row.provider,
      priority: row.priority,
      model: featureModel?.modelId ?? generic?.modelId ?? row.defaultModel,
      cooldownUntil: row.cooldownUntil,
      status: row.status,
    };
  });
}

export async function routeAI(req: AIRequest): Promise<AIResponse> {
  if (!req.messages.length) {
    throw new Error('AI request must include messages');
  }

  const key = req.cacheable ? cacheKey(req) : null;

  if (key) {
    const cached = await getCached(key);

    if (cached) {
      return {
        text: cached,
        provider: 'GEMINI',
        model: 'cache',
        latency: 0,
        fallbackUsed: false,
        inputTokens: 0,
        outputTokens: 0,
        cached: true,
      };
    }
  }

  const rows = await providerRows(req.feature);
  let last: unknown;
  let attempted = 0;

  for (const row of rows) {
    if (row.cooldownUntil && row.cooldownUntil > new Date()) {
      continue;
    }

    // Workers AI fallback remains text-only in this app.
    // Never silently drop an image and hallucinate an analysis.
    if (req.images?.length && row.provider === 'CLOUDFLARE') {
      continue;
    }

    const client = clients[row.provider];

    if (!client.isConfigured()) {
      last = new AIProviderError(
        `${row.provider} is not configured`,
        'NOT_CONFIGURED',
        false,
      );
      continue;
    }

    attempted++;

    for (
      let attempt = 0;
      attempt <= aiRuntimeConfig.maxRetries;
      attempt++
    ) {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        aiRuntimeConfig.timeoutMs,
      );

      try {
        const out = await client.generate(req, row.model, controller.signal);
        clearTimeout(timer);

        const latency = Date.now() - started;
        await recordSuccess(row.provider, latency);

        const fallbackUsed = attempted > 1;

        await db.aIUsage.create({
          data: {
            userId: req.userId,
            provider: row.provider,
            model: row.model,
            feature: req.feature,
            status: 'SUCCESS',
            inputTokens: out.inputTokens ?? 0,
            outputTokens: out.outputTokens ?? 0,
            latency,
            fallbackUsed,
          },
        });

        if (key) {
          await setCached(
            key,
            req.feature,
            out.text,
            req.cacheTtlSeconds ?? 3600,
          );
        }

        return {
          text: out.text,
          provider: row.provider,
          model: row.model,
          latency,
          fallbackUsed,
          inputTokens: out.inputTokens ?? 0,
          outputTokens: out.outputTokens ?? 0,
        };
      } catch (error) {
        clearTimeout(timer);

        const normalized = normalizeProviderError(error);
        last = normalized;

        await recordFailure(row.provider, normalized.message);

        if (
          !normalized.retryable ||
          attempt === aiRuntimeConfig.maxRetries
        ) {
          break;
        }

        await sleep(500 * 2 ** attempt);
      }
    }

    const normalized = normalizeProviderError(last);

    await db.aIUsage
      .create({
        data: {
          userId: req.userId,
          provider: row.provider,
          model: row.model,
          feature: req.feature,
          status: 'FAILED',
          latency: 0,
          fallbackUsed: attempted > 1,
          errorCode: normalized.code,
        },
      })
      .catch(() => undefined);
  }

  throw new AIProviderError(
    'All AI providers are temporarily unavailable',
    'ALL_PROVIDERS_FAILED',
    true,
  );
}

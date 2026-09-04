import type { AIProviderClient, AIRequest } from '../types';
import { AIProviderError } from '../errors';

function getCloudflareAiToken() {
  // Keep the runtime Workers AI token separate from the deployment token.
  // CLOUDFLARE_API_TOKEN remains a backwards-compatible fallback for the
  // existing Vercel deployment until environments are migrated.
  return process.env.CLOUDFLARE_AI_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
}

export const cloudflareProvider: AIProviderClient = {
  provider: 'CLOUDFLARE',
  isConfigured: () => !!getCloudflareAiToken() && !!process.env.CLOUDFLARE_ACCOUNT_ID,
  async generate(req: AIRequest, model: string, signal: AbortSignal) {
    const token = getCloudflareAiToken();
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token || !accountId) {
      throw new AIProviderError('Cloudflare AI is not configured', 'CLOUDFLARE_NOT_CONFIGURED', false);
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: req.messages,
        max_tokens: req.maxTokens ?? 1600,
        temperature: req.temperature ?? 0.5,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AIProviderError(
        `Cloudflare ${res.status}: ${body.slice(0, 300)}`,
        `CLOUDFLARE_${res.status}`,
        res.status === 429 || res.status >= 500,
        res.status,
      );
    }

    const data = await res.json();
    const text = data.result?.response ?? data.result?.text ?? '';
    if (!text) {
      throw new AIProviderError('Cloudflare returned no text', 'CLOUDFLARE_EMPTY', true);
    }
    return { text };
  },
};

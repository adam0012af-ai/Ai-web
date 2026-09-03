import type { AIProviderClient, AIRequest } from '../types';
import { AIProviderError } from '../errors';

export const openrouterProvider: AIProviderClient = {
  provider: 'OPENROUTER',

  isConfigured: () => !!process.env.OPENROUTER_API_KEY,

  async generate(req: AIRequest, model: string, signal: AbortSignal) {
    const lastUserIndex = req.messages.map((message) => message.role).lastIndexOf('user');

    const messages = req.messages.map((message, index) => {
      if (index !== lastUserIndex || !req.images?.length || message.role !== 'user') {
        return message;
      }

      return {
        role: message.role,
        content: [
          {
            type: 'text',
            text: message.content,
          },
          ...req.images.map((image) => ({
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.data}`,
            },
          })),
        ],
      };
    });

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer':
            process.env.OPENROUTER_APP_URL ??
            process.env.APP_URL ??
            (process.env.VERCEL_PROJECT_PRODUCTION_URL
              ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
              : 'http://localhost:3000'),
          'X-Title': process.env.OPENROUTER_APP_NAME ?? 'Nexa AI',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: req.temperature ?? 0.5,
          max_tokens: req.maxTokens ?? 1600,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();

      throw new AIProviderError(
        `OpenRouter ${response.status}: ${body.slice(0, 300)}`,
        `OPENROUTER_${response.status}`,
        response.status === 429 || response.status >= 500,
        response.status,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    const text =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content
              .map((part: { type?: string; text?: string }) =>
                part.type === 'text' ? (part.text ?? '') : '',
              )
              .join('')
          : '';

    if (!text) {
      throw new AIProviderError(
        'OpenRouter returned no text',
        'OPENROUTER_EMPTY',
        true,
      );
    }

    return {
      text,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  },
};

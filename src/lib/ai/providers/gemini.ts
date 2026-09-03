import type { AIProviderClient, AIRequest } from '../types';
import { AIProviderError } from '../errors';

export const geminiProvider: AIProviderClient = {
  provider: 'GEMINI',

  isConfigured: () => !!process.env.GEMINI_API_KEY,

  async generate(req: AIRequest, model: string, signal: AbortSignal) {
    const system = req.messages.find((message) => message.role === 'system')?.content;
    const visibleMessages = req.messages.filter((message) => message.role !== 'system');
    const lastUserIndex = visibleMessages.map((message) => message.role).lastIndexOf('user');

    const contents = visibleMessages.map((message, index) => {
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [{ text: message.content }];

      if (index === lastUserIndex && req.images?.length) {
        for (const image of req.images) {
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        }
      }

      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY ?? '')}`,
      {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: system
            ? {
                parts: [{ text: system }],
              }
            : undefined,
          generationConfig: {
            temperature: req.temperature ?? 0.5,
            maxOutputTokens: req.maxTokens ?? 1600,
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();

      throw new AIProviderError(
        `Gemini ${response.status}: ${body.slice(0, 300)}`,
        `GEMINI_${response.status}`,
        response.status === 429 || response.status >= 500,
        response.status,
      );
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? '')
        .join('') ?? '';

    if (!text) {
      throw new AIProviderError(
        'Gemini returned no text',
        'GEMINI_EMPTY',
        true,
      );
    }

    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  },
};

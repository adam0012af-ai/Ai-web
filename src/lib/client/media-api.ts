export async function getCsrfToken() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  const body = await response.json();

  if (!response.ok || !body?.token) {
    throw new Error('Unable to start a secure request.');
  }

  return body.token as string;
}

export async function createMediaJob(input: {
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
  operation: string;
  title: string;
  prompt?: string;
  negativePrompt?: string;
  projectId?: string | null;
  settings?: Record<string, unknown>;
}) {
  const token = await getCsrfToken();

  const response = await fetch('/api/media/jobs', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(input),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? 'Unable to save media job.');
  }

  return body.job;
}

export async function runTextAI(
  feature: 'writer' | 'brainstorm' | 'summarizer',
  input: string,
) {
  const token = await getCsrfToken();

  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify({ feature, input }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? 'AI request failed.');
  }

  return String(body.text ?? '');
}

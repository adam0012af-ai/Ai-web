import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { detectSourceProject, parseSourceZip } from '@/lib/code/zip';
import { verifyCsrf } from '@/lib/security/csrf';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { requestFingerprint } from '@/lib/security/request';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 1_200_000;

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await enforceRateLimit(await requestFingerprint('code-inspect', user.id), 10, 60);

    const form = await req.formData();
    const archive = form.get('archive');

    if (!(archive instanceof File)) {
      return NextResponse.json({ error: 'Choose a ZIP project first.' }, { status: 400 });
    }

    if (!archive.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Only ZIP project archives are supported.' }, { status: 400 });
    }

    if (archive.size <= 0 || archive.size > MAX_ARCHIVE_BYTES) {
      return NextResponse.json({ error: 'ZIP must be smaller than 25 MB.' }, { status: 413 });
    }

    const parsed = parseSourceZip(Buffer.from(await archive.arrayBuffer()));
    const project = detectSourceProject(parsed.files);
    let previewBytes = 0;

    const files = [...parsed.files.values()]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((file) => {
        let content: string | null = null;

        if (file.text && file.data.length <= 140_000 && previewBytes + file.data.length <= MAX_PREVIEW_BYTES) {
          content = file.data.toString('utf8');
          previewBytes += file.data.length;
        }

        return {
          path: file.path,
          size: file.data.length,
          text: file.text,
          content,
        };
      });

    return NextResponse.json({
      archive: {
        name: archive.name,
        size: archive.size,
        extractedBytes: parsed.extractedBytes,
      },
      project,
      files,
      warnings: parsed.warnings,
    });
  } catch (error) {
    console.error('[CODE INSPECT]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to inspect this ZIP project.',
      },
      { status: 400 },
    );
  }
}

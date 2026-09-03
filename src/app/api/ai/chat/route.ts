import { getCurrentUser } from '@/lib/auth/session';
import { verifyCsrf } from '@/lib/security/csrf';
import { db } from '@/lib/db';
import { routeAI } from '@/lib/ai/router';
import { getUserAiAllowance } from '@/lib/ai/limits';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { requestFingerprint } from '@/lib/security/request';

function responsePreferenceBlock(settings: {
  responseDetail: string;
  defaultTone: string;
  codeExplanation: string;
} | null) {
  if (!settings) return '';

  const detail =
    settings.responseDetail === 'concise'
      ? 'Keep answers concise unless more detail is necessary.'
      : settings.responseDetail === 'detailed'
        ? 'Provide detailed, structured answers with useful caveats.'
        : 'Use balanced detail: clear and useful without unnecessary repetition.';

  const tone =
    settings.defaultTone === 'friendly'
      ? 'Use a friendly natural tone.'
      : settings.defaultTone === 'direct'
        ? 'Use a direct practical tone.'
        : settings.defaultTone === 'creative'
          ? 'Use a creative tone when appropriate while staying accurate.'
          : 'Use a professional clear tone.';

  const code =
    settings.codeExplanation === 'minimal'
      ? 'For code, give the implementation with only critical explanation.'
      : settings.codeExplanation === 'detailed'
        ? 'For code, explain important implementation details and tradeoffs.'
        : 'For code, use a balanced amount of explanation.';

  return `${detail} ${tone} ${code}`;
}

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return Response.json({ error: 'Invalid request token' }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await Promise.all([
      enforceRateLimit(
        await requestFingerprint('chat-minute', user.id),
        12,
        60,
      ),
      enforceRateLimit(
        await requestFingerprint('chat-ip'),
        40,
        60,
      ),
      enforceRateLimit(
        await requestFingerprint('chat-hour', user.id),
        180,
        3600,
      ),
    ]);

    const body = await req.json();
    const text = String(body.message ?? '').trim();
    const requestedProjectId = body.projectId
      ? String(body.projectId)
      : null;

    if (!text) {
      return Response.json(
        { error: 'Message is required.' },
        { status: 400 },
      );
    }

    const allowance = await getUserAiAllowance(user.id);

    if (allowance.remaining <= 0) {
      return Response.json(
        { error: 'Daily AI limit reached.' },
        { status: 429 },
      );
    }

    if (text.length > allowance.maxPromptChars) {
      return Response.json(
        { error: 'Message is too long for your plan.' },
        { status: 413 },
      );
    }

    let project = null;

    if (requestedProjectId) {
      project = await db.project.findFirst({
        where: {
          id: requestedProjectId,
          userId: user.id,
          archived: false,
        },
        include: {
          memories: {
            where: { enabled: true },
            orderBy: { updatedAt: 'desc' },
            take: 30,
          },
        },
      });

      if (!project) {
        return Response.json(
          { error: 'Project not found.' },
          { status: 404 },
        );
      }
    }

    let conversation = body.conversationId
      ? await db.conversation.findFirst({
          where: {
            id: String(body.conversationId),
            userId: user.id,
          },
        })
      : null;

    if (
      conversation &&
      requestedProjectId &&
      conversation.projectId !== requestedProjectId
    ) {
      return Response.json(
        { error: 'Conversation does not belong to this project.' },
        { status: 409 },
      );
    }

    if (conversation?.projectId && !project) {
      project = await db.project.findFirst({
        where: {
          id: conversation.projectId,
          userId: user.id,
          archived: false,
        },
        include: {
          memories: {
            where: { enabled: true },
            orderBy: { updatedAt: 'desc' },
            take: 30,
          },
        },
      });
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          userId: user.id,
          projectId: project?.id ?? null,
          title: text.slice(0, 64),
        },
      });
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: text,
      },
    });

    const [history, settings] = await Promise.all([
      db.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: 16,
      }),
      db.userSettings.findUnique({
        where: { userId: user.id },
        select: {
          responseDetail: true,
          defaultTone: true,
          codeExplanation: true,
        },
      }),
    ]);

    const projectBlock = project
      ? `
You are currently working inside the user's project "${project.name}".
Project description: ${project.description || 'None'}
Project language preference: ${project.language}
Project instructions:
${project.instructions || 'None'}

Project memory:
${project.memories.length
  ? project.memories
      .map((memory) => `- ${memory.label}: ${memory.content}`)
      .join('\n')
  : 'No saved project memory.'}

Use the project instructions and memory when relevant. Do not invent project facts beyond this memory and the conversation.`
      : '';

    const result = await routeAI({
      userId: user.id,
      feature: 'chat',
      messages: [
        {
          role: 'system',
          content: `You are Nexa AI Assistant. Be accurate and useful.
${responsePreferenceBlock(settings)}
${conversation.summary ? `Earlier conversation summary: ${conversation.summary}` : ''}
${projectBlock}`,
        },
        ...history.reverse().map((message) => ({
          role:
            message.role === 'ASSISTANT'
              ? ('assistant' as const)
              : message.role === 'SYSTEM'
                ? ('system' as const)
                : ('user' as const),
          content: message.content,
        })),
      ],
    });

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: result.text,
        provider: result.provider,
        model: result.model,
      },
    });

    const messageCount = await db.message.count({
      where: { conversationId: conversation.id },
    });

    if (messageCount > 24 && messageCount % 12 === 0) {
      const older = await db.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: messageCount - 12,
      });

      const condensed = older
        .slice(-40)
        .map((message) => `${message.role}: ${message.content}`)
        .join('\n');

      try {
        const summary = await routeAI({
          userId: user.id,
          feature: 'context-summary',
          messages: [
            {
              role: 'system',
              content:
                'Create a compact factual memory for future turns. Preserve names, constraints, decisions, unresolved questions and critical numbers. Do not add new facts.',
            },
            {
              role: 'user',
              content: `Existing summary: ${conversation.summary ?? 'None'}\n\nOlder messages:\n${condensed}`,
            },
          ],
        });

        await db.conversation.update({
          where: { id: conversation.id },
          data: {
            summary: summary.text.slice(0, 12000),
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.warn('[CONTEXT SUMMARY]', error);
      }
    } else {
      await db.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    const encoder = new TextEncoder();
    let cursor = 0;

    const stream = new ReadableStream({
      pull(controller) {
        if (cursor >= result.text.length) {
          controller.close();
          return;
        }

        const end = Math.min(
          result.text.length,
          cursor +
            Math.max(
              8,
              Math.min(36, result.text.length - cursor),
            ),
        );

        controller.enqueue(
          encoder.encode(result.text.slice(cursor, end)),
        );

        cursor = end;
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-conversation-id': conversation.id,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[AI CHAT]', error);

    return Response.json(
      {
        error:
          'The AI service is temporarily unavailable. Please try again.',
      },
      { status: 503 },
    );
  }
}

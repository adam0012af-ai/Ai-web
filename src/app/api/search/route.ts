import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { aiTools, localizeTool } from '@/data/ai-tools';
import { normalizeLocale } from '@/lib/i18n';
import { getProductMessages } from '@/lib/product-messages';

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const q =
    new URL(req.url).searchParams
      .get('q')
      ?.trim()
      .slice(0, 80) ?? '';

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get('nexa_locale')?.value,
  );
  const labels = getProductMessages(locale).search;
  const mediaJobLabel = locale === 'ar' ? 'مهمة إنتاج' : 'Media job';
  const mediaAssetLabel = locale === 'ar' ? 'وسائط' : 'Media asset';

  const [
    projects,
    prompts,
    conversations,
    files,
    mediaJobs,
    mediaAssets,
    posts,
  ] = await Promise.all([
    db.project.findMany({
      where: {
        userId: user.id,
        archived: false,
        OR: [
          {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    }),
    db.savedPrompt.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    }),
    db.conversation.findMany({
      where: {
        userId: user.id,
        title: {
          contains: q,
          mode: 'insensitive',
        },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    }),
    db.uploadedFile.findMany({
      where: {
        userId: user.id,
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    db.mediaJob.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            prompt: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    db.mediaAsset.findMany({
      where: {
        userId: user.id,
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    db.blogPost.findMany({
      where: {
        published: true,
        OR: [
          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            excerpt: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 5,
      orderBy: { publishedAt: 'desc' },
    }),
  ]);

  const needle = q.toLowerCase();

  const tools = aiTools
    .filter((tool) => {
      const localized = localizeTool(tool, locale);
      return [
        tool.title,
        tool.description,
        tool.titleAr,
        tool.descriptionAr,
        localized.displayCategory,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    })
    .slice(0, 5)
    .map((tool) => {
      const localized = localizeTool(tool, locale);

      return {
        type: labels.aiTool,
        label: localized.displayTitle,
        href:
          tool.slug === 'chat'
            ? '/dashboard/ai/chat'
            : `/dashboard/ai/${tool.slug}`,
      };
    });

  return NextResponse.json({
    results: [
      ...projects.map((item) => ({
        type: labels.project,
        label: item.name,
        href: `/dashboard/projects/${item.id}`,
      })),
      ...prompts.map((item) => ({
        type: labels.prompt,
        label: item.title,
        href: '/dashboard/prompts',
      })),
      ...tools,
      ...conversations.map((item) => ({
        type: labels.conversation,
        label: item.title,
        href: item.projectId
          ? `/dashboard/ai/chat?project=${item.projectId}&conversation=${item.id}`
          : `/dashboard/ai/chat?conversation=${item.id}`,
      })),
      ...mediaJobs.map((item) => ({
        type: mediaJobLabel,
        label: item.title,
        href: '/dashboard/studio/jobs',
      })),
      ...mediaAssets.map((item) => ({
        type: mediaAssetLabel,
        label: item.name,
        href: '/dashboard/studio/library',
      })),
      ...files.map((item) => ({
        type: labels.file,
        label: item.name,
        href: '/dashboard/files',
      })),
      ...posts.map((item) => ({
        type: labels.blog,
        label: item.title,
        href: `/blog/${item.slug}`,
      })),
    ].slice(0, 20),
  });
}

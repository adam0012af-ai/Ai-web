import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { toolBySlug, aiTools, localizeTool } from '@/data/ai-tools';
import { PageHeader } from '@/components/dashboard/page-header';
import { ToolRunner } from '@/components/ai/tool-runner';
import { normalizeLocale } from '@/lib/i18n';

export function generateStaticParams() {
  return aiTools
    .filter((tool) => tool.slug !== 'chat')
    .map((tool) => ({
      tool: tool.slug,
    }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;

  if (tool === 'chat') {
    redirect('/dashboard/ai/chat');
  }

  const selectedTool = toolBySlug(tool);

  if (!selectedTool) {
    notFound();
  }

  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('nexa_locale')?.value);
  const localized = localizeTool(selectedTool, locale);

  return (
    <>
      <PageHeader
        eyebrow={localized.displayCategory}
        title={localized.displayTitle}
        description={localized.displayDescription}
      />

      <ToolRunner
        slug={selectedTool.slug}
        title={localized.displayTitle}
        description={localized.displayDescription}
        locale={locale}
      />
    </>
  );
}

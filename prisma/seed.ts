import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL required');
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const plans = [
    ['free', 'Free', 0, 30],
    ['pro', 'Pro', 1900, 300],
    ['business', 'Business', 5900, 1500],
    ['enterprise', 'Enterprise', 0, 10000],
  ] as const;

  for (const [slug, name, priceMonthly, dailyRequests] of plans) {
    await db.plan.upsert({
      where: { slug },
      create: {
        slug,
        name,
        priceMonthly,
        dailyRequests,
        description: `${name} plan for growing AI workflows`,
      },
      update: {
        name,
        priceMonthly,
        dailyRequests,
      },
    });
  }

  const providers = [
    [
      'GEMINI',
      1,
      process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    ],
    [
      'OPENROUTER',
      2,
      process.env.OPENROUTER_MODEL ?? 'openrouter/free',
    ],
    [
      'CLOUDFLARE',
      3,
      process.env.CLOUDFLARE_MODEL ?? '@cf/zai-org/glm-4.7-flash',
    ],
  ] as const;

  for (const [provider, priority, defaultModel] of providers) {
    await db.aIProviderConfig.upsert({
      where: { provider },
      create: {
        provider,
        priority,
        defaultModel,
      },
      update: {
        priority,
        defaultModel,
      },
    });

    const existing = await db.aIModel.findFirst({
      where: {
        provider,
        modelId: defaultModel,
        feature: null,
      },
    });

    if (!existing) {
      await db.aIModel.create({
        data: {
          provider,
          modelId: defaultModel,
          displayName: defaultModel,
          enabled: true,
          isDefault: true,
          priority,
        },
      });
    }
  }

  console.log(
    'Seed complete: plans and AI provider configuration are ready. No demo users or passwords were created.',
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

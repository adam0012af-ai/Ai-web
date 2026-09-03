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

const unsafeDemoAdminEmails = [
  'superadmin@nexa.demo',
  'admin@nexa.demo',
];

async function main() {
  await db.user.updateMany({
    where: {
      email: { in: unsafeDemoAdminEmails },
    },
    data: {
      role: 'USER',
      suspendedAt: new Date(),
    },
  });

  const configuredEmail = process.env.NEXA_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  if (!configuredEmail) {
    console.log(
      'Security baseline complete. NEXA_ADMIN_EMAIL is not configured; existing non-demo admin roles were left unchanged.',
    );
    return;
  }

  if (unsafeDemoAdminEmails.includes(configuredEmail)) {
    throw new Error(
      'NEXA_ADMIN_EMAIL cannot use a seeded demo address. Use your real registered Nexa account.',
    );
  }

  const user = await db.user.findUnique({
    where: { email: configuredEmail },
  });

  if (!user) {
    console.warn(
      `Security baseline: no registered Nexa account matches NEXA_ADMIN_EMAIL (${configuredEmail}). Register/login with that email first, then redeploy.`,
    );
    return;
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      role: 'SUPER_ADMIN',
      suspendedAt: null,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });

  console.log(
    `Security baseline complete. SUPER_ADMIN access is assigned to the configured Nexa account (${configuredEmail}).`,
  );
}

main()
  .catch((error) => {
    console.error('Security baseline failed:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

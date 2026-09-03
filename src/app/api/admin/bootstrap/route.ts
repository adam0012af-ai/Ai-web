import { createPublicKey, verify } from 'node:crypto';

import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com';
const EXPECTED_AUDIENCE = 'nexa-admin-promotion';
const EXPECTED_REPOSITORY = 'adam0012af-ai/Ai-web';
const EXPECTED_OWNER = 'adam0012af-ai';
const EXPECTED_ACTOR = 'adam0012af-ai';
const EXPECTED_REF = 'refs/heads/main';
const UNSAFE_DEMO_EMAILS = [
  'superadmin@nexa.demo',
  'admin@nexa.demo',
];

type OidcHeader = {
  alg?: string;
  kid?: string;
};

type OidcClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  repository?: string;
  repository_owner?: string;
  actor?: string;
  ref?: string;
  event_name?: string;
};

type JsonWebKeyLike = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
};

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(
    Buffer.from(value, 'base64url').toString('utf8'),
  ) as T;
}

async function verifyGitHubOidc(token: string) {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid OIDC token');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson<OidcHeader>(encodedHeader);
  const claims = decodeBase64UrlJson<OidcClaims>(encodedPayload);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported OIDC signing method');
  }

  const discoveryResponse = await fetch(
    `${EXPECTED_ISSUER}/.well-known/openid-configuration`,
    { cache: 'no-store' },
  );

  if (!discoveryResponse.ok) {
    throw new Error('Unable to load GitHub OIDC configuration');
  }

  const discovery = (await discoveryResponse.json()) as {
    jwks_uri?: string;
  };

  if (!discovery.jwks_uri) {
    throw new Error('GitHub OIDC JWKS endpoint missing');
  }

  const jwksResponse = await fetch(discovery.jwks_uri, {
    cache: 'no-store',
  });

  if (!jwksResponse.ok) {
    throw new Error('Unable to load GitHub OIDC signing keys');
  }

  const jwks = (await jwksResponse.json()) as {
    keys?: JsonWebKeyLike[];
  };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);

  if (!jwk) {
    throw new Error('GitHub OIDC signing key not found');
  }

  const publicKey = createPublicKey({
    key: jwk,
    format: 'jwk',
  });

  const verified = verify(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    Buffer.from(encodedSignature, 'base64url'),
  );

  if (!verified) {
    throw new Error('Invalid GitHub OIDC signature');
  }

  const now = Math.floor(Date.now() / 1000);
  const audienceMatches = Array.isArray(claims.aud)
    ? claims.aud.includes(EXPECTED_AUDIENCE)
    : claims.aud === EXPECTED_AUDIENCE;

  if (
    claims.iss !== EXPECTED_ISSUER ||
    !audienceMatches ||
    !claims.exp ||
    claims.exp <= now ||
    (claims.nbf && claims.nbf > now) ||
    claims.repository !== EXPECTED_REPOSITORY ||
    claims.repository_owner !== EXPECTED_OWNER ||
    claims.actor !== EXPECTED_ACTOR ||
    claims.ref !== EXPECTED_REF ||
    claims.event_name !== 'workflow_dispatch'
  ) {
    throw new Error('GitHub OIDC claims were rejected');
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    await verifyGitHubOidc(token);
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized GitHub workflow request' },
      { status: 403 },
    );
  }

  let email = '';

  try {
    const body = (await request.json()) as { email?: unknown };
    email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  if (!email || !email.includes('@') || email.length > 320) {
    return NextResponse.json(
      { error: 'A valid Nexa account email is required' },
      { status: 400 },
    );
  }

  if (UNSAFE_DEMO_EMAILS.includes(email)) {
    return NextResponse.json(
      { error: 'Demo admin accounts cannot be promoted' },
      { status: 400 },
    );
  }

  await db.user.updateMany({
    where: {
      email: { in: UNSAFE_DEMO_EMAILS },
    },
    data: {
      role: 'USER',
      suspendedAt: new Date(),
    },
  });

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      {
        error:
          'Configured Nexa account was not found. Register or sign in with that email first, then run the workflow again.',
      },
      { status: 404 },
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      role: 'SUPER_ADMIN',
      suspendedAt: null,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    role: 'SUPER_ADMIN',
  });
}

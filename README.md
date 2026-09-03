# Nexa AI — Multi-provider AI SaaS Platform

Nexa AI is a large Next.js SaaS foundation with a public marketing site, secure email/password authentication, onboarding, user and admin dashboards, AI tools, persistent chat, usage controls, support, billing architecture, notifications, blog, analytics, and a centralized multi-provider AI router.

## Stack

- Next.js App Router + TypeScript
- React
- Tailwind CSS
- PostgreSQL
- Prisma ORM + PostgreSQL adapter
- React Hook Form + Zod
- Gemini (primary)
- OpenRouter (first fallback)
- Cloudflare Workers AI (second fallback)

## AI routing

All AI requests go through `src/lib/ai/router.ts`. UI components do not call providers directly.

Default order:

1. Gemini
2. OpenRouter
3. Cloudflare Workers AI

The router includes provider enable/disable state, database-controlled priority, timeouts, limited exponential-backoff retries, health status, cooldown, fallback, usage logging, and friendly client-facing errors.

## Main routes

The project contains more than 50 page routes including public pages, authentication, dashboard routes, AI workspace routes and admin routes.

## Environment variables

Copy `.env.example` to `.env` locally. Never commit real secrets.

Required for a real deployment:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SESSION_SECRET="long-random-secret"
```

AI providers are optional individually; at least one needs to be configured for generation:

```env
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.5-flash-lite"
OPENROUTER_API_KEY=""
OPENROUTER_MODEL="openrouter/free"
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_MODEL="@cf/zai-org/glm-4.7-flash"
```

`APP_URL` is optional on Vercel and recommended when using a custom domain.

## Local setup

```bash
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

A dependency-free local import/route check is included:

```bash
npm run check:project
```

With dependencies installed:

```bash
npm run typecheck
npm run build
```

GitHub also runs **Validate Nexa V6** on `main` to generate Prisma, type-check TypeScript, and run the i18n audit before browser testing.

## Database seed accounts

After `npm run db:seed`:

- `superadmin@nexa.demo`
- `admin@nexa.demo`
- `demo@nexa.demo`
- password: `DemoPassword123`

Change/remove demo accounts before a production launch.

## Mobile-first deployment

See `MOBILE_DEPLOY_AR.md`. A manual GitHub Action called **Database Setup** is included so the database can be initialized from a phone after adding repository secrets.

## Production integrations still required

The architecture intentionally leaves external provider-specific work explicit instead of pretending it is complete:

- transactional email transport (Resend / SES / SMTP)
- payment gateway for paid plans
- object storage for persistent large file/media uploads (S3 / R2 / Vercel Blob etc.)

## Deployment

The repository includes `vercel.json` and is designed for Vercel Git integration. Add environment variables in Vercel before the first successful production deployment. Vercel will run `npm install` and `npm run build`.

## V6 premium workspace

The current V6 foundation includes Smart Start, unified creation routes, real image/video provider jobs, ZIP-based Code Studio, centralized admin localization, project-scoped AI context, and production validation through GitHub Actions.

RTL update

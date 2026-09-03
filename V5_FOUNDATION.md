# Nexa AI V5 — Full Arabic Intelligence & Workspace (Foundation)

This is the first V5 production foundation.

Implemented in this package:
- Projects database model and dashboard.
- Project-specific persistent instructions.
- Project Memory items.
- Project-ready conversation/file relations in Prisma.
- Saved Prompt Library database model and dashboard.
- New dashboard navigation entries for Projects and Prompt Library.
- Central `product-messages.ts` bilingual dictionary for the new V5 product surfaces.
- Arabic/English Settings page.
- Settings now persist app language to both the database and the `nexa_locale` cookie.
- New AI personalization preferences:
  - Response detail: concise / balanced / detailed.
  - Default tone: professional / friendly / direct / creative.
  - Code explanation: minimal / balanced / detailed.
- Translation Guard script: `npm run check:i18n`.
  - In this V5 foundation it REPORTS likely hardcoded English strings but intentionally does not fail production builds yet.
  - Later V5 phases can turn it into a strict build gate after all existing pages have migrated.
- Existing AI routing/API keys are unchanged.
- Existing conversations remain valid because `projectId` is nullable.
- Existing files remain valid because `projectId` is nullable.

Next V5 migration phases:
1. Connect project memory/instructions directly into project-scoped AI chat.
2. Migrate every Dashboard/Auth/Admin/Marketing page to the centralized message dictionaries.
3. Universal search across projects, prompts, conversations, and files.
4. Admin feature flags, changelog, usage center, and localization audit UI.
5. Persistent knowledge-base storage when object storage is configured.

# V5 Phase 2 Build Hotfix

Fixes the Vercel TypeScript build failure in:
`src/app/(admin)/admin/support/[id]/page.tsx`

Cause:
`ReplyForm` gained a required `locale` prop in V5 Phase 2, while the admin support detail page still called it without that prop.

Fix:
- Resolve `nexa_locale` from cookies.
- Pass `locale` to `ReplyForm`.
- Localize the reply timestamp formatting to match the selected app language.

No schema, API key, provider, or business-logic changes.

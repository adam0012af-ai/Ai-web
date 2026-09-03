# Nexa AI V6 — Phase 2 Premium Core + Security Baseline

## Critical security correction
The previous public seed created privileged demo accounts using fixed credentials and the production build executed that seed on every deployment.

Phase 2 changes this safely:
- `prisma/seed.ts` now seeds only plans and AI provider configuration.
- It never creates demo users, admin users, or passwords.
- `scripts/security-baseline.ts` suspends the two legacy privileged demo addresses and demotes them to USER.
- `NEXA_ADMIN_EMAIL` safely promotes an already-registered real Nexa account to SUPER_ADMIN during deployment.
- No password is stored in the repository or environment variable for admin promotion.
- Existing legitimate non-demo admin accounts are not modified.
- Build remains compatible with the current automatic database bootstrap strategy.

## Premium App Shell
- Desktop navigation is now chat-first and less dashboard-heavy.
- Large "New chat" entry point.
- Recent real conversations appear directly in the sidebar.
- Core navigation and account navigation are separated.
- Admin Console link appears only for ADMIN / SUPER_ADMIN.
- Mobile drawer is reorganized into Main and Account sections.
- Mobile bottom navigation is now Home / Chat / Studio / Projects / Profile.

## Global Create menu
Real destinations only:
- New chat
- Project
- Image Studio
- Video Studio
- Document Analyzer
- Code Assistant
- Prompt Library
- Voice-capable AI Chat

No Agent button is exposed yet because Agents are not implemented end-to-end.

## Chat-first Home
`/dashboard` is transformed from a statistics dashboard into a premium AI starting surface:
- "What do you want to accomplish today?"
- A real AI composer.
- Submitting the composer creates a real persistent AI conversation through the existing `/api/ai/chat` route and opens it.
- Direct launch cards for image, video, code, document, project, and voice experiences.
- Continue where you left off from real conversations.
- Real active projects.
- Real AI daily usage.
- Real recent Media Jobs.
- No fake usage numbers or fake generated assets.

## Command Center
Ctrl/Cmd + K now includes:
- workspace navigation
- account navigation
- AI tools
- New chat
- New project
- Image Studio
- Video Studio
- Code Assistant
- Document Analyzer
- existing Universal Search results

## Admin access
The existing `/admin/*` authorization remains enforced server-side.
The Admin shell now supports Arabic/English direction and navigation labels on desktop.

To enable your real account:
1. Your Nexa account must already be registered.
2. Add Vercel environment variable:
   `NEXA_ADMIN_EMAIL=<your Nexa login email>`
3. Redeploy.
4. The configured account becomes `SUPER_ADMIN`.
5. Open `/admin/dashboard` or use the Admin button visible in the app.

## Intentionally not claimed as complete
- Actual image/video provider rendering is NOT enabled by this phase.
- Existing V6 Studio job queue remains honest about provider-disconnected state.
- Code ZIP Source Workspace is NOT implemented in this phase.
- AI Agents are NOT exposed because they are not yet implemented end-to-end.

Those are the next functional phases and must be tested with real inputs after implementation.

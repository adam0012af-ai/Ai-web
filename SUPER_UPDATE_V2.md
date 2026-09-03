# Nexa AI — Super Update V2

This update adds:

- Real multimodal Image Analyzer using the existing central AI provider router.
- Gemini image understanding as primary.
- OpenRouter multimodal request support as fallback when the selected model supports vision.
- Cloudflare is intentionally skipped for image payloads so the app never silently drops an image.
- Per-plan daily image analysis limit enforcement.
- Local text-document loading for Document Analyzer without storing the source file.
- TXT/MD/CSV/JSON/HTML/XML/code file support up to 1 MB client-side.
- Tool result copy and TXT export.
- Cached/fallback result indicators.
- Mobile bottom navigation.
- Unread notification badge.
- Installable PWA manifest + safe static-only service worker.
- Safe-area viewport improvements for mobile devices.

No new API keys are required.

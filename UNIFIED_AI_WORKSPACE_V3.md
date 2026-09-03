# Nexa AI — Unified AI Workspace V3

Major UX and AI behavior update:

- Replaces the old split Input / Output cards with one conversation-style workspace.
- One bottom composer, like a modern AI chat product.
- Follow-up questions keep recent tool context.
- Image Analyzer keeps the current image attached for follow-up questions until removed.
- Text file attachments stay in context until removed, while the source file is never stored server-side.
- + attachment menu lives inside the composer.
- Real Markdown rendering with GitHub-flavored Markdown.
- Headings, bold, lists, links, tables, inline code, fenced code blocks, and blockquotes render properly.
- Copy, Regenerate, per-response download, and full-conversation export.
- Mobile-first sticky composer with Enter-to-send and Shift+Enter for a new line.
- AI Chat also gains rich Markdown rendering and a multiline composer.
- Server-side tool API now accepts a bounded recent history window for natural follow-up turns.
- Stronger image grounding prompt to reduce unsupported guesses.
- Image analysis prompt explicitly separates visible evidence from inference and uncertainty.
- Cache is disabled when conversation history is present so follow-up answers cannot accidentally reuse an unrelated cached response.
- No new AI API keys are required.

New npm dependencies:
- react-markdown
- remark-gfm

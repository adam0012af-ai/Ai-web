# Nexa AI V5 — Phase 2

Included:

## Full Arabic completion for the recorded pages
- Files
- Notifications
- Profile
- Security
- Billing & plan
- Support
- Support ticket detail / replies
- Localized empty states, buttons, placeholders, status labels, priorities, invoice states, dates, and helper copy.
- Known seeded notification copy is localized in Arabic.

## Project AI integration
- Project chats now store `projectId` on the conversation.
- Project chat loads only conversations belonging to that project.
- Project persistent instructions are injected into the AI system context.
- Enabled Project Memory items are injected into project AI context.
- Existing non-project chat remains separate and unchanged.
- User AI response preferences are now applied to chat routing:
  - response detail
  - default tone
  - code explanation level

## Voice Mode Pro
- Voice input in the main persistent AI Chat.
- Arabic speech recognition uses `ar-EG`; English uses `en-US`.
- Push to start/stop listening.
- Optional auto-send after speech.
- Read AI responses aloud.
- Read-speed selector: 0.8x / 1x / 1.2x / 1.4x.
- Starting voice input stops current speech playback.
- No new API key is required; browser speech capabilities are used.

## Smart Actions
On the latest AI response:
- Shorten
- Expand
- Simplify
- Translate
- Turn into steps
- Turn into table
- Continue
- Improve answer

These actions use the existing conversation context and AI routing.

## Universal Search foundation
Search now covers:
- Projects
- Saved prompts
- AI tools in Arabic and English
- Conversations
- Files
- Blog posts

Search result types are localized according to the app language.

No new npm package or API key is required.

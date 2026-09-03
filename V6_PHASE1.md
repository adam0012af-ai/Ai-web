# Nexa AI V6 — Multimodal Studio Phase 1

This phase intentionally requires no new API keys.

## Database / Media Core
- New MediaKind enum: IMAGE / VIDEO / AUDIO.
- New MediaJobStatus lifecycle:
  DRAFT → WAITING_PROVIDER → QUEUED → PROCESSING → RENDERING → COMPLETED / FAILED / CANCELED.
- New MediaJob model for render/transcription/TTS jobs.
- New MediaAsset model for future persistent generated/uploaded media.
- Jobs and assets can belong to a Project.
- Existing User and Project models now have media relations.
- Existing data remains valid because all additions are additive.

## Studio Hub
New route: /dashboard/studio
- Video Studio
- Image Studio
- Audio Studio
- Media Library
- Render Queue
- Counts for assets, pending jobs, and completed jobs.
- Explicit provider-disconnected state instead of broken generation buttons.

## Video Studio Pro Foundation
Route: /dashboard/studio/video
- Text-to-video, image-to-video, video-to-video modes.
- Local reference image/video preview.
- Aspect ratios: 16:9, 9:16, 1:1, 4:5, 3:2, 21:9, custom.
- Resolutions: 360p, 480p, 720p, 1080p, 1440p, 4K.
- FPS: 24 / 25 / 30 / 50 / 60.
- Duration: 5 / 10 / 15 / 30 / 60 seconds.
- Scene counts and motion strength.
- Camera presets and visual styles.
- Draft / Standard / High / Ultra generation quality.
- Custom width and height.
- Batch export settings for YouTube / Reels-TikTok / Square / Instagram 4:5.
- AI Prompt Enhancer using the already-connected text AI providers.
- AI Storyboard Generator using the already-connected text AI providers.
- Render configuration saved to the persistent Media Job Queue.
- Reference files remain local until persistent storage is connected.

## Image Studio Pro Foundation
Route: /dashboard/studio/image
- Text-to-image, image-to-image, edit-image modes.
- Local reference image preview and dimensions.
- Image ratios and sizes up to 4096px / 4K.
- 1–4 variations.
- Draft / Standard / High / Ultra quality.
- Multiple style presets.
- AI Prompt Enhancer.
- Persistent generation drafts in the Media Job Queue.
- Link to the existing real Image Analyzer.

## Audio Studio
Route: /dashboard/studio/audio
- Browser Text-to-Speech preview with available device voices.
- Voice selector, speed, and pitch.
- Arabic / English speech-to-text through browser speech recognition.
- AI transcript summarization using existing providers.
- Local uploaded-audio playback.
- Persistent AI-TTS export and uploaded-audio transcription drafts.
- MP3/WAV AI export intentionally deferred until the final provider-key phase.

## Render Queue
Route: /dashboard/studio/jobs
- Filter by Image / Video / Audio.
- Job status and progress.
- Favorite.
- Retry.
- Cancel.
- Delete.
- Provider waiting state is explicit.

## Media Library
Route: /dashboard/studio/library
- Persistent asset model and UI are ready.
- It will populate after generation/storage providers are connected.

## Architecture
- src/lib/media/provider-registry.ts defines provider capability slots without secrets.
- No provider keys are stored in code or database.
- No new npm dependencies.
- Full Arabic/English UI for all V6 Phase 1 surfaces.
- Dashboard navigation includes Studio.

## Universal Search
- Existing workspace search now includes Media Jobs and Media Assets.

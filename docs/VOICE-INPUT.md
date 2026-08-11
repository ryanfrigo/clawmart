# Voice input (dictation)

Talk instead of typing, in the two places where a Clawmart user writes a paragraph of
prose: the idea field on the Studio homepage, and the mission-goal field in the mission
panel.

**Voice is strictly additive.** Typing always works. Dictated speech is appended to
whatever is already in the field — it never replaces it, including when the user types
while the mic is open. If a browser can't do dictation at all, the field behaves exactly
as it did before.

## Credit

The interaction model is borrowed from **[OpenWhispr](https://github.com/OpenWhispr/openwhispr)**
(MIT) — a local-first push-to-talk dictation app. OpenWhispr is an Electron desktop
program with no web SDK, so **nothing is imported from it**; this is a clean-room
implementation of the same idea for the browser.

## The two paths

Feature detection at mount picks one, once, on the client (`use-voice-input.ts`).

| Mode | Trigger | Where the audio is processed |
| --- | --- | --- |
| `speech` | `SpeechRecognition` / `webkitSpeechRecognition` exists | The browser's own speech service. Chrome and Edge send audio to Google's / Microsoft's services, Safari to Apple's. **It never reaches Clawmart's servers.** |
| `upload` | No Web Speech API, but `MediaRecorder` + `getUserMedia` + a container we can send | Recorded in the browser, POSTed to `/api/transcribe`, forwarded to OpenRouter. We do not store it — no database row, no disk, no logs. |
| `none` | Neither works, or the page is not a secure context | Nothing happens. The mic is shown disabled with an explanation, and typing is unaffected. |

We do **not** claim the `speech` path is on-device. Chrome shipped an opt-in local mode
recently, but the default in every browser that implements the API is a remote service,
so the UI says "your browser's own speech service" and stops there. No accuracy figures
are claimed anywhere, because none have been measured.

### Browser support, as built

| Browser | Mode | Notes |
| --- | --- | --- |
| Chrome (desktop, Android) | `speech` | `webkitSpeechRecognition`. Ends a session on silence even with `continuous = true`, so the hook auto-restarts up to 30 times per take. |
| Edge (Chromium) | `speech` | Same API; transcription is Microsoft's service. |
| Safari (macOS 14.5+, iOS 14.5+) | `speech` | `webkitSpeechRecognition`. Requires a user gesture — the mic button is that gesture. |
| Firefox | `upload` | Ships no `SpeechRecognition` (`media.webspeech.recognition.enable` is off by default). Records Ogg/Opus and uses the route. |
| Anything over plain HTTP (except localhost) | `none` | Not a secure context; the mic would never be granted. |
| Older / niche browsers with neither API | `none` | Typing only. |

## Files

- `src/components/voice/transcript.ts` — pure merge (`appendTranscript`) and model-output
  cleanup. The "never overwrite typed text" invariant lives here.
- `src/components/voice/voice-state.ts` — the permission/recording state machine.
- `src/components/voice/audio.ts` — container preference + mime→format map, shared by the
  recorder and the route so the client can't record something the server rejects.
- `src/components/voice/use-voice-input.ts` — the hook: feature detection, both capture
  paths, cleanup.
- `src/components/voice/mic-button.tsx` — the control.
- `src/components/voice/dictation-status.tsx` — the `aria-live` status line.
- `src/components/voice/dictation-control.tsx` — the drop-in used by the two forms.
- `src/app/api/transcribe/route.ts` — the fallback route.
- `tests/voice.test.ts` — unit tests for everything pure above.

## Accessibility

- The mic is a real `<button type="button">`: Tab reaches it, Enter and Space fire it.
- `aria-pressed` reflects whether the mic is open; the accessible name changes with the
  phase ("Dictate your idea" → "Stop dictating" → "Transcribing your recording").
- Phase changes are announced through a `role="status" aria-live="polite"` region. Interim
  words are *not* announced — they stream into the textarea instead, where re-announcing
  every partial guess would be unusable.
- The resting hint sits outside the live region so it isn't read out on mount.

## `/api/transcribe`

```
POST /api/transcribe
Content-Type: <the MediaRecorder mimeType, e.g. audio/ogg;codecs=opus>
Body: raw audio bytes

200 { "text": "..." }
4xx/5xx { "error": "<code>" }
```

Guards, in order: auth (401 `unauthenticated`) → key present (503 `not_configured`) →
container we accept (415 `unsupported_format`) → declared `Content-Length` (413
`too_large`) → rate limit (429 `rate_limited`) → real payload size (413) → empty body
(400). Nothing is logged but an upstream status code — never the audio, a transcript, the
API key, or an upstream error body (which can echo request headers).

**Rate limiting is per-instance and best-effort** (30 requests/hour/user in a module-level
map). Serverless spreads users across instances, so treat it as a flood guard, not a cost
control. The real bounds on a single call are the 2-minute client recording cap and the
4 MB body cap. If dictation ever gets heavy use, move the limit into the Convex
`rateLimits` table like every other limit in this codebase.

### Why not Whisper

The brief said "a Whisper model via OpenRouter". OpenRouter has no
`/v1/audio/transcriptions` endpoint and does not serve Whisper. What it does support is
audio as a base64 `input_audio` content part on an ordinary chat completion, so the route
uses `google/gemini-2.5-flash` — the same model the Studio pipeline already uses for
worker steps. This is a general audio model doing transcription, not a dedicated ASR
model; the UI makes no accuracy claims as a result.

The list of containers OpenRouter accepts (wav, mp3, aiff, aac, ogg, flac, m4a, pcm16,
pcm24) notably excludes **WebM**, which is Chrome's MediaRecorder default. That is why
`RECORDER_MIME_PREFERENCE` is an explicit list rather than "whatever the browser picks".
In practice Chrome never reaches this route anyway.

### Enabling the fallback in an environment

The route reads `OPENROUTER_API_KEY` from the **Next.js** environment. Today that key
lives only in the **Convex** environment (Convex actions are what use it), so on Vercel
the route answers `503 not_configured` and Firefox users see "Voice transcription isn't
configured in this environment… type it instead." That degrades cleanly and is the
correct default until someone decides dictation is worth the spend.

To turn it on, the founder sets the key in Vercel (piped, never printed):

```
vercel env add OPENROUTER_API_KEY production
```

Chrome, Edge and Safari dictation works with or without this — they never call the route.

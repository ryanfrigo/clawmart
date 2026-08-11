# OpenWhispr — integration assessment and what we support

[OpenWhispr](https://github.com/OpenWhispr/openwhispr) (MIT) is a privacy-first
voice-to-text desktop app: hold a global hotkey, speak, and the text is typed
into whatever field has focus. Local models (whisper.cpp, Parakeet via
sherpa-onnx) or a cloud provider, user's choice.

This records what was investigated, what does not work and why, and the one path
that does — so the question is not re-litigated from the README alone.

## Why it cannot transcribe for Clawmart

Clawmart is a Next.js app served from Vercel. OpenWhispr is an **Electron
desktop application** (Electron 41, better-sqlite3). It cannot be bundled into a
web page, and a visitor to clawmart.co has nothing to connect to.

The obvious next question is whether it exposes something a browser could call.
Three surfaces were checked:

| Surface | Verdict |
|---|---|
| **Local HTTP API** | Does not exist. The README's "public HTTP API" is the *cloud* API at `https://api.openwhispr.com/api/v1`, not a localhost server. There is no local port to talk to. |
| **Cloud API** | Real, but the wrong shape: it manages **notes, folders, transcriptions and usage** that already exist in a user's account. No documented endpoint accepts audio. It needs an `owk_live_*` key generated inside the desktop app, and its published rate limits are Pro/Business tiers. Sending our users' audio there would also defeat the entire privacy argument for using it. |
| **MCP server** | For an AI assistant to read a user's OpenWhispr data. Clawmart is not an MCP client, and this is not a transcription path. |

The repository's own `examples/` directory contains exactly one integration
example — `custom-asr-shim` — and it points the other way: it is for plugging
*your* speech recognizer **into** OpenWhispr. Nothing there makes OpenWhispr a
recognizer for someone else.

So we took the idea, not the dependency: `docs/VOICE-INPUT.md` describes the
dictation we built (Web Speech API, with a Whisper fallback), credited to
OpenWhispr as the inspiration.

## What we do support: dictate straight into Clawmart

OpenWhispr's actual product is typing into *any* focused field. That includes
ours, and it is the integration that costs a user nothing:

1. Focus the idea box on the homepage, or the goal box in a mission panel.
2. Hold the OpenWhispr hotkey and speak.
3. The text lands in the field like typing, because OS-level dictation raises
   real `input` events and both fields are ordinary controlled `<textarea>`s.

Two properties make this reliable, and both are covered by tests so a refactor
cannot quietly break them:

- **Our dictation appends, it never overwrites.** If OpenWhispr put text in the
  field and you then press our mic button, the two coexist — the invariant lives
  in `appendTranscript` (`src/components/voice/transcript.ts`).
- **Nothing intercepts input.** Neither field uses `onBeforeInput` or `onPaste`
  handlers, and neither calls `preventDefault` on typing; external insertion is
  handled exactly like keyboard input.

Known limitation, stated rather than hidden: both fields are `disabled` while a
build is submitting or "Surprise me" is running. A disabled field accepts no
keystrokes, so dictation during those few seconds is dropped by the browser —
exactly as typing would be. Wait for the control to re-enable.

## If OpenWhispr later ships a local transcription endpoint

That is the one change that would make a backend integration worth building. It
would be the most private of the three paths — audio never leaving the machine,
better than Web Speech (which sends to Google/Microsoft/Apple) and better than
our OpenRouter fallback — and it would work in browsers with no Web Speech API.

The seam is ready. `src/components/voice/use-voice-input.ts` already selects
between capture modes, so a third would slot in beside `speech` and `recorder`.
It would need a documented localhost port, CORS headers permitting
`https://clawmart.co`, and a way to discover that port. None of those exist
today, so nothing here is built on the assumption that they will.

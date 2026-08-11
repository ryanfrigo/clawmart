/**
 * Audio container facts shared by the recorder (browser) and the transcription
 * route (server). Kept in one file so the client can never record something the
 * server is going to reject.
 *
 * OpenRouter takes audio as a base64 `input_audio` part on chat completions and
 * accepts wav / mp3 / aiff / aac / ogg / flac / m4a / pcm16 / pcm24. It has NO
 * /v1/audio/transcriptions endpoint, so there is no Whisper route to call —
 * see docs/VOICE-INPUT.md.
 *
 * Notably absent from that list: WebM, which is what Chrome's MediaRecorder
 * produces by default. That is fine in practice — Chrome uses the Web Speech
 * path and never reaches this fallback — but it is why the preference list
 * below is explicit rather than "whatever the browser likes".
 */

export type OpenRouterAudioFormat = "ogg" | "m4a" | "wav" | "mp3" | "flac" | "aac";

/**
 * Upload ceiling. Opus in Ogg runs ~3 KB/s, so 4 MB is far more audio than the
 * 2-minute client-side cap can produce — it exists to bound a hostile request,
 * not a real one.
 */
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/** Hard stop on a single dictation take, so a forgotten mic can't run forever. */
export const MAX_RECORDING_MS = 120_000;

/**
 * Containers we ask MediaRecorder for, best first. Every entry maps to a format
 * OpenRouter accepts. Firefox — the browser this path exists for — supports the
 * Ogg/Opus entries.
 */
export const RECORDER_MIME_PREFERENCE = [
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
] as const;

/**
 * Map a MediaRecorder `mimeType` (e.g. `audio/ogg; codecs=opus`) to the format
 * string OpenRouter expects, or null when we cannot vouch for it. The server
 * treats null as a rejected upload rather than guessing.
 */
export function audioFormatFromMime(mime: string): OpenRouterAudioFormat | null {
  const base = mime.split(";")[0].trim().toLowerCase();
  switch (base) {
    case "audio/ogg":
    case "audio/opus":
      return "ogg";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return "m4a";
    case "audio/aac":
      return "aac";
    case "audio/wav":
    case "audio/wave":
    case "audio/x-wav":
      return "wav";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/flac":
    case "audio/x-flac":
      return "flac";
    default:
      return null;
  }
}

/** First supported container from RECORDER_MIME_PREFERENCE, or null. */
export function pickRecorderMime(
  isTypeSupported: (mime: string) => boolean
): string | null {
  for (const mime of RECORDER_MIME_PREFERENCE) {
    if (isTypeSupported(mime)) return mime;
  }
  return null;
}

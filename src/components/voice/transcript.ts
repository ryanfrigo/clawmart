/**
 * Transcript merging — the one rule voice input must never break: dictation
 * APPENDS to what the user already typed, it never replaces it.
 *
 * Pure and dependency-free so it can be unit tested (tests/voice.test.ts) and
 * reasoned about without a browser. The hook (use-voice-input.ts) is the only
 * caller.
 */

/** Punctuation that should hug the previous word instead of taking a space. */
const HUGGING_START = /^[,.!?;:)\]}'"…]/;

/**
 * Append a dictated chunk to existing text.
 *
 * - Whitespace inside the chunk is collapsed; the chunk is trimmed.
 * - An empty chunk is a no-op — never blank out what is already there.
 * - Existing text is preserved byte-for-byte; we only add to its end.
 * - `maxLength`, when given, hard-truncates the result so the merged value can
 *   never exceed the field's own `maxLength` (which would silently drop the
 *   user's typing on submit).
 */
export function appendTranscript(
  existing: string,
  addition: string,
  maxLength?: number
): string {
  const chunk = addition.replace(/\s+/g, " ").trim();
  if (!chunk) return clamp(existing, maxLength);
  if (!existing) return clamp(chunk, maxLength);

  // Existing text that is only whitespace still counts as "user typed nothing",
  // but we keep it rather than deleting it — appending is always safe.
  const needsSpace = !/\s$/.test(existing) && !HUGGING_START.test(chunk);
  return clamp(existing + (needsSpace ? " " : "") + chunk, maxLength);
}

function clamp(text: string, maxLength?: number): string {
  if (maxLength === undefined || text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

/**
 * Tidy a transcript that came back from the fallback transcription route.
 *
 * Chat models like to wrap answers in quotes or prefix them with "Transcript:";
 * strip only those two obvious wrappers. We do not "fix" the words themselves —
 * inventing content the user did not say would be worse than a rough transcript.
 */
export function cleanModelTranscript(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^(?:transcript|transcription)\s*:\s*/i, "");
  const quoted = /^"([\s\S]*)"$/.exec(text) ?? /^'([\s\S]*)'$/.exec(text);
  if (quoted) text = quoted[1];
  return text.trim();
}

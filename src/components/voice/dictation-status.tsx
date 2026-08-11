"use client";

/**
 * The words next to the mic.
 *
 * Two jobs, and they need different ARIA treatment:
 *  - Transient state (asking, listening, transcribing, denied, failed) goes in
 *    a polite live region so a screen reader hears the mic open and close.
 *  - The resting hint is ordinary text; announcing it on mount would be noise.
 *
 * Every "listening" string names where the audio is actually processed. We
 * cannot make privacy promises about someone else's speech service, so we say
 * whose it is and stop there — no accuracy claims, no "fully private".
 */

import type { VoiceMode } from "./use-voice-input";
import type { VoicePhase } from "./voice-state";

const LISTENING: Record<Exclude<VoiceMode, "none">, string> = {
  // Chrome and Edge stream to Google's / Microsoft's speech services, Safari to
  // Apple's. What we can state flatly is that it isn't coming through us.
  speech:
    "Listening — your browser's own speech service does the transcribing, so the audio never reaches Clawmart.",
  // Firefox ships no SpeechRecognition, so this is the honest trade.
  upload:
    "Recording — this browser can't transcribe on its own, so the clip is sent to Clawmart and on to an AI model. We don't store it.",
};

function transientText(mode: VoiceMode, phase: VoicePhase, message: string | null): string | null {
  switch (phase) {
    case "requesting":
      return "Waiting for microphone permission…";
    case "listening":
      return mode === "none" ? null : LISTENING[mode];
    case "transcribing":
      return "Transcribing the recording…";
    case "denied":
    case "error":
      return message;
    default:
      return null;
  }
}

export function DictationStatus({
  mode,
  phase,
  message,
}: {
  mode: VoiceMode;
  phase: VoicePhase;
  message: string | null;
}) {
  const transient = transientText(mode, phase, message);
  const problem = phase === "denied" || phase === "error";

  return (
    <>
      <span
        role="status"
        aria-live="polite"
        className={
          problem
            ? "self-center text-[12px] leading-snug text-destructive"
            : "self-center text-[12px] leading-snug text-muted-foreground"
        }
      >
        {transient}
      </span>
      {!transient && (
        <span className="self-center text-[12px] leading-snug text-muted-foreground">
          {mode === "none"
            ? "Dictation isn't available in this browser — typing works as normal."
            : "Dictate instead of typing. Speech is added to the end; nothing you typed is replaced."}
        </span>
      )}
    </>
  );
}

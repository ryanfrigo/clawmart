/**
 * The dictation state machine.
 *
 * Microphone UX goes wrong in the gaps between states — a button that says
 * "stop" while the permission prompt is still open, a spinner that never
 * clears after a denied prompt. Pulling the transitions out of the hook makes
 * them unit-testable (tests/voice.test.ts) and keeps the hook to plumbing.
 */

export type VoicePhase =
  /** Feature detection says neither path can work here. Terminal. */
  | "unsupported"
  | "idle"
  /** Permission prompt is open, or the engine has not fired onstart yet. */
  | "requesting"
  | "listening"
  /** Fallback path only: audio is uploading / the model is transcribing. */
  | "transcribing"
  | "denied"
  | "error";

export type VoiceState = {
  phase: VoicePhase;
  /** User-facing explanation for `denied` / `error`. Null otherwise. */
  message: string | null;
};

export type VoiceAction =
  | { type: "start" }
  | { type: "listening" }
  | { type: "uploading" }
  | { type: "settle" }
  | { type: "denied"; message: string }
  | { type: "error"; message: string };

export const IDLE_STATE: VoiceState = { phase: "idle", message: null };
export const UNSUPPORTED_STATE: VoiceState = { phase: "unsupported", message: null };

export function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  // Nothing rescues an unsupported browser; typing still works, which is the
  // point. Guarding here means callers never have to check.
  if (state.phase === "unsupported") return state;

  switch (action.type) {
    case "start":
      // Retrying after a denial is legitimate — the user may have just fixed
      // the browser's site permission. Ignore starts while already busy.
      if (
        state.phase === "requesting" ||
        state.phase === "listening" ||
        state.phase === "transcribing"
      ) {
        return state;
      }
      return { phase: "requesting", message: null };

    case "listening":
      // Only a pending request can become a live mic. A late `onstart` after
      // the user already stopped must not reopen the recording UI.
      return state.phase === "requesting" ? { phase: "listening", message: null } : state;

    case "uploading":
      return state.phase === "listening" ? { phase: "transcribing", message: null } : state;

    case "settle":
      // Stop / finished / gave up. Keeps a denial or error visible, because
      // those messages are the only thing telling the user what to do next.
      return state.phase === "denied" || state.phase === "error" ? state : IDLE_STATE;

    case "denied":
      return { phase: "denied", message: action.message };

    case "error":
      return { phase: "error", message: action.message };
  }
}

/** True while the mic is open or about to be — drives `aria-pressed`. */
export function isCapturing(phase: VoicePhase): boolean {
  return phase === "requesting" || phase === "listening";
}

/** True while any work is in flight, including the fallback upload. */
export function isBusy(phase: VoicePhase): boolean {
  return isCapturing(phase) || phase === "transcribing";
}

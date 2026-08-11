"use client";

/**
 * Dictation for a plain <textarea>.
 *
 * Idea borrowed, with credit, from OpenWhispr (MIT,
 * github.com/OpenWhispr/openwhispr) — a local-first push-to-talk dictation
 * app. OpenWhispr is an Electron desktop program with no web SDK, so nothing
 * is imported from it; only the interaction model is.
 *
 * Two paths, picked by feature detection:
 *
 *   "speech"  Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 *             Zero dependency, interim words stream straight into the field.
 *             Where the audio actually goes is the browser's business: Chrome
 *             and Edge send it to Google's / Microsoft's speech services,
 *             Safari to Apple's. It does not touch Clawmart's servers.
 *   "upload"  MediaRecorder -> POST /api/transcribe. For Firefox, which ships
 *             no SpeechRecognition. Audio reaches our server and is forwarded
 *             to OpenRouter; we never write it to disk or a database.
 *   "none"    Neither works (or the page is not a secure context). The
 *             textarea keeps working exactly as before — that is the whole
 *             fallback.
 *
 * The invariant that matters: dictation only ever APPENDS. If the user types
 * while the mic is open, the next chunk lands after their text instead of
 * wiping it.
 */

import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { useAuthToken } from "@convex-dev/auth/react";
import { MAX_AUDIO_BYTES, MAX_RECORDING_MS, pickRecorderMime } from "./audio";
import { appendTranscript, cleanModelTranscript } from "./transcript";
import {
  IDLE_STATE,
  isBusy,
  voiceReducer,
  type VoicePhase,
} from "./voice-state";

/* ---------------- Web Speech API types ----------------
 * lib.dom.d.ts ships SpeechRecognitionResultList but not SpeechRecognition
 * itself, and never `webkitSpeechRecognition`. These are the minimum shapes we
 * touch, named so they cannot collide with a future lib.dom addition.
 */

type SpeechResultEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};
type SpeechErrorEvent = Event & { error?: string };

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function recorderAvailable(): boolean {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  return pickRecorderMime((m) => MediaRecorder.isTypeSupported(m)) !== null;
}

/* ---------------- feature detection ----------------
 * Which path this browser gets can't be known while rendering on the server,
 * and guessing then correcting after hydration would flip the button's meaning
 * under the user. useSyncExternalStore is the sanctioned way to say "server
 * renders nothing, the client fills it in": getServerSnapshot returns null, and
 * the first client render swaps in the real answer.
 *
 * Capabilities don't change within a session, so the answer is computed once
 * and cached — getSnapshot must be cheap and return a stable value.
 */

let cachedMode: VoiceMode | null = null;

function detectMode(): VoiceMode {
  if (cachedMode) return cachedMode;
  // Both paths need a secure context; without one the browser silently never
  // grants the mic, which just looks like a broken button.
  if (typeof window !== "undefined" && !window.isSecureContext) cachedMode = "none";
  else if (speechCtor()) cachedMode = "speech";
  else if (recorderAvailable()) cachedMode = "upload";
  else cachedMode = "none";
  return cachedMode;
}

/** Capabilities never change, so there is nothing to subscribe to. */
const subscribeToNothing = () => () => {};
const serverMode = () => null;

/* ---------------- messages ---------------- */

const DENIED =
  "Microphone access is blocked. Allow it in your browser's site settings, then try again — typing works either way.";

const UPLOAD_ERRORS: Record<string, string> = {
  unauthenticated: "Sign in to use dictation.",
  not_configured:
    "Voice transcription isn't configured in this environment. Your browser has no built-in dictation, so type it instead.",
  rate_limited: "You've hit the dictation limit for now. Typing still works.",
  too_large: "That take was too long to send. Record a shorter one.",
  unsupported_format: "This browser recorded audio we can't transcribe. Type it instead.",
  empty: "We couldn't make out any speech in that recording.",
};

/* ---------------- hook ---------------- */

export type VoiceMode = "speech" | "upload" | "none";

export type UseVoiceInputOptions = {
  /** Current field value. The hook reads it to detect manual edits. */
  value: string;
  /** Called with the merged value. Same signature as the field's setter. */
  onChange: (next: string) => void;
  /** The field's own maxLength, so a merge can never overflow it. */
  maxLength?: number;
  disabled?: boolean;
};

export type UseVoiceInput = {
  /** null until feature detection has run on the client. */
  mode: VoiceMode | null;
  phase: VoicePhase;
  message: string | null;
  toggle: () => void;
  stop: () => void;
};

/** Chrome ends a recognition session on silence even with continuous = true. */
const MAX_AUTO_RESTARTS = 30;

export function useVoiceInput({
  value,
  onChange,
  maxLength,
  disabled = false,
}: UseVoiceInputOptions): UseVoiceInput {
  const mode = useSyncExternalStore(subscribeToNothing, detectMode, serverMode);
  const [state, dispatch] = useReducer(voiceReducer, IDLE_STATE);

  // /api/transcribe is auth-gated, so the fallback path has to prove who it is.
  // Returns null outside a ConvexAuthProvider, in which case the route answers
  // 401 and the user is told to sign in — it never fails open.
  const authToken = useAuthToken();

  // Latest props, read from callbacks that must stay identity-stable.
  const onChangeRef = useRef(onChange);
  const maxLengthRef = useRef(maxLength);
  const authTokenRef = useRef(authToken);
  useEffect(() => {
    onChangeRef.current = onChange;
    maxLengthRef.current = maxLength;
    authTokenRef.current = authToken;
  });

  // baseRef is the text everything dictated so far is appended to; pushedRef is
  // the last value we handed the parent. When `value` arrives as something we
  // did not push, the user typed — rebase so their edit survives the next chunk.
  const baseRef = useRef(value);
  const pushedRef = useRef(value);
  useEffect(() => {
    if (value !== pushedRef.current) {
      baseRef.current = value;
      pushedRef.current = value;
    }
  }, [value]);

  const push = useCallback((next: string) => {
    pushedRef.current = next;
    onChangeRef.current(next);
  }, []);

  // Web Speech handles
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const restartsRef = useRef(0);

  // MediaRecorder handles
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Stop pressed while the permission prompt is still open. */
  const cancelPendingRef = useRef(false);
  /** Component unmounted — drop whatever comes back. */
  const abandonedRef = useRef(false);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const transcribe = useCallback(
    async (blob: Blob, mime: string) => {
      try {
        const token = authTokenRef.current;
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: {
            "content-type": mime,
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: blob,
        });
        if (abandonedRef.current) return;

        if (!res.ok) {
          let code = "";
          try {
            const body: unknown = await res.json();
            if (body && typeof body === "object" && "error" in body) {
              const e = (body as { error?: unknown }).error;
              if (typeof e === "string") code = e;
            }
          } catch {
            // Non-JSON error body — fall through to the generic message.
          }
          dispatch({
            type: "error",
            message:
              UPLOAD_ERRORS[code] ??
              "Transcription failed. Nothing you typed was lost — keep going.",
          });
          return;
        }

        const data: unknown = await res.json();
        const raw =
          data && typeof data === "object" && typeof (data as { text?: unknown }).text === "string"
            ? (data as { text: string }).text
            : "";
        const text = cleanModelTranscript(raw);
        if (!text) {
          dispatch({ type: "error", message: UPLOAD_ERRORS.empty });
          return;
        }
        const merged = appendTranscript(baseRef.current, text, maxLengthRef.current);
        baseRef.current = merged;
        push(merged);
        dispatch({ type: "settle" });
      } catch {
        if (abandonedRef.current) return;
        dispatch({
          type: "error",
          message: "Couldn't reach the transcription service. Keep typing — nothing was lost.",
        });
      }
    },
    [push]
  );

  const startSpeech = useCallback(() => {
    const Ctor = speechCtor();
    if (!Ctor) {
      dispatch({ type: "error", message: "Dictation isn't available in this browser." });
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = navigator.language || "en-US";

    rec.onstart = () => dispatch({ type: "listening" });

    rec.onresult = (event) => {
      // Everything before resultIndex is already folded into baseRef.
      let settled = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) settled += alt.transcript;
        else interim += alt.transcript;
      }
      // Words are arriving, so the session is healthy — forget past restarts.
      restartsRef.current = 0;
      if (settled) {
        baseRef.current = appendTranscript(baseRef.current, settled, maxLengthRef.current);
      }
      // Interim text is shown in the field but never committed to baseRef, so
      // the next chunk replaces the guess rather than stacking on it.
      push(
        interim
          ? appendTranscript(baseRef.current, interim, maxLengthRef.current)
          : baseRef.current
      );
    };

    rec.onerror = (event) => {
      const err = event.error ?? "";
      if (err === "no-speech" || err === "aborted") return; // onend handles these
      wantListeningRef.current = false;
      if (err === "not-allowed" || err === "service-not-allowed") {
        dispatch({ type: "denied", message: DENIED });
      } else if (err === "network") {
        dispatch({
          type: "error",
          message:
            "Your browser's speech service couldn't be reached. Try again, or type it instead.",
        });
      } else {
        dispatch({
          type: "error",
          message: "Dictation stopped unexpectedly. Everything you'd said so far is still here.",
        });
      }
    };

    rec.onend = () => {
      if (wantListeningRef.current && restartsRef.current < MAX_AUTO_RESTARTS) {
        restartsRef.current += 1;
        try {
          rec.start();
          return;
        } catch {
          // Engine refused to restart — fall through and settle.
        }
      }
      wantListeningRef.current = false;
      recRef.current = null;
      dispatch({ type: "settle" });
    };

    recRef.current = rec;
    wantListeningRef.current = true;
    restartsRef.current = 0;
    dispatch({ type: "start" });
    try {
      rec.start();
    } catch {
      wantListeningRef.current = false;
      recRef.current = null;
      dispatch({ type: "error", message: "Couldn't start the microphone. Try again." });
    }
  }, [push]);

  const startRecorder = useCallback(async () => {
    cancelPendingRef.current = false;
    dispatch({ type: "start" });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        dispatch({ type: "denied", message: DENIED });
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        dispatch({ type: "error", message: "No microphone found on this device." });
      } else {
        dispatch({ type: "error", message: "Couldn't open the microphone. Try again." });
      }
      return;
    }

    if (cancelPendingRef.current || abandonedRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      dispatch({ type: "settle" });
      return;
    }

    const mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) {
      stream.getTracks().forEach((t) => t.stop());
      dispatch({ type: "error", message: UPLOAD_ERRORS.unsupported_format });
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      releaseStream();
      if (abandonedRef.current) return;
      if (blob.size === 0) {
        dispatch({ type: "settle" });
        return;
      }
      if (blob.size > MAX_AUDIO_BYTES) {
        dispatch({ type: "error", message: UPLOAD_ERRORS.too_large });
        return;
      }
      dispatch({ type: "uploading" });
      void transcribe(blob, mime);
    };

    recorder.start();
    dispatch({ type: "listening" });
    timerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    }, MAX_RECORDING_MS);
  }, [releaseStream, transcribe]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    wantListeningRef.current = false;

    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        // Already stopped; onend may never come, so settle below.
      }
      dispatch({ type: "settle" });
      return;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // onstop drives the upload from here — do NOT settle, that would hide
      // the "transcribing" state the user needs to see.
      try {
        recorder.stop();
        return;
      } catch {
        releaseStream();
      }
    }

    // Nothing running, or the permission prompt is still open.
    cancelPendingRef.current = true;
    dispatch({ type: "settle" });
  }, [releaseStream]);

  // A field that goes disabled mid-dictation (form submitted) must close the mic.
  useEffect(() => {
    if (disabled && isBusy(state.phase)) stop();
  }, [disabled, state.phase, stop]);

  useEffect(() => {
    abandonedRef.current = false;
    return () => {
      abandonedRef.current = true;
      wantListeningRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        recRef.current?.abort();
      } catch {
        // Nothing to abort.
      }
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        // Nothing to stop.
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const phase: VoicePhase = mode === "none" ? "unsupported" : state.phase;

  function toggle() {
    if (disabled || mode === null || mode === "none") return;
    if (isBusy(phase)) {
      stop();
      return;
    }
    if (mode === "speech") startSpeech();
    else void startRecorder();
  }

  return { mode, phase, message: state.message, toggle, stop };
}

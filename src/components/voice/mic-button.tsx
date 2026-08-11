"use client";

/**
 * The mic toggle. A real <button>, so keyboard and screen-reader support come
 * from the platform rather than from us re-implementing them: Tab reaches it,
 * Enter and Space fire it, `aria-pressed` tells assistive tech whether the mic
 * is open, and the accessible name changes with the phase so "what does this
 * do right now" is never ambiguous.
 *
 * Deliberately plain — the surrounding forms are being restyled separately, so
 * this leans entirely on existing tokens.
 */

import { Loader2, Mic, MicOff, Square } from "lucide-react";
import { isCapturing, type VoicePhase } from "./voice-state";
import { cn } from "@/lib/utils";

/** Accessible name + tooltip for each phase. */
function labelFor(phase: VoicePhase, fieldLabel: string): string {
  switch (phase) {
    case "requesting":
      return "Waiting for microphone access";
    case "listening":
      return "Stop dictating";
    case "transcribing":
      return "Transcribing your recording";
    case "unsupported":
      return "Dictation isn't available in this browser";
    case "denied":
      return `Microphone blocked — retry dictating ${fieldLabel}`;
    default:
      return `Dictate ${fieldLabel}`;
  }
}

export function MicButton({
  phase,
  fieldLabel,
  disabled = false,
  onToggle,
  className,
}: {
  phase: VoicePhase;
  /** Fills the accessible name, e.g. "your idea" -> "Dictate your idea". */
  fieldLabel: string;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const capturing = isCapturing(phase);
  const label = labelFor(phase, fieldLabel);
  const unavailable = phase === "unsupported";

  return (
    <button
      type="button"
      onClick={onToggle}
      // Left focusable when unsupported so keyboard users can still read the
      // explanation next to it, but inert and marked as such.
      disabled={disabled || phase === "transcribing"}
      aria-disabled={unavailable || undefined}
      aria-pressed={capturing}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        capturing
          ? "border-lobster/50 bg-lobster/10 text-lobster"
          : "border-border text-muted-foreground hover:border-lobster/40 hover:text-lobster",
        unavailable && "cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground",
        className
      )}
    >
      {phase === "transcribing" ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : unavailable ? (
        <MicOff className="size-4" aria-hidden="true" />
      ) : phase === "listening" ? (
        <Square className="size-3.5 fill-current" aria-hidden="true" />
      ) : (
        <Mic className={cn("size-4", phase === "requesting" && "animate-pulse")} aria-hidden="true" />
      )}
    </button>
  );
}

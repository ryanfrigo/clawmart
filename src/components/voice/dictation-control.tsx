"use client";

/**
 * Drop-in dictation for a textarea: the mic button plus the live status line
 * that explains what is happening and where the audio is going.
 *
 * Usage is one element next to the field it feeds:
 *   <DictationControl value={idea} onChange={setIdea} maxLength={IDEA_MAX}
 *                     fieldLabel="your idea" disabled={busy} />
 *
 * Voice is strictly additive: the textarea stays fully typeable at all times,
 * and every dictated chunk is appended to whatever is already in it.
 */

import { DictationStatus } from "./dictation-status";
import { MicButton } from "./mic-button";
import { useVoiceInput } from "./use-voice-input";
import { cn } from "@/lib/utils";

export function DictationControl({
  value,
  onChange,
  maxLength,
  disabled,
  fieldLabel,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  disabled?: boolean;
  /** Goes into the button's accessible name: "Dictate {fieldLabel}". */
  fieldLabel: string;
  className?: string;
}) {
  const { mode, phase, message, toggle } = useVoiceInput({
    value,
    onChange,
    maxLength,
    disabled,
  });

  // Nothing to show until feature detection has run — rendering a guess would
  // mean a button that changes meaning right after hydration.
  if (mode === null) return null;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <MicButton phase={phase} fieldLabel={fieldLabel} disabled={disabled} onToggle={toggle} />
      <DictationStatus mode={mode} phase={phase} message={message} />
    </div>
  );
}

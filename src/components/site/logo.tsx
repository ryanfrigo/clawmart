import { cn } from "@/lib/utils";

/**
 * Clawmart mark — a lobster pincer, open toward the prey.
 * Coral tile, ink claw. Tasteful, not clownish.
 */
export function ClawMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-7 w-7", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-lobster" />
      {/* pincer: a bitten disc opening to the right */}
      <path
        d="M16 16 L24.7 11.6 A9.5 9.5 0 1 0 24.7 20.4 Z"
        className="fill-background"
      />
      {/* the small fixed thumb of the claw */}
      <circle cx="24" cy="16" r="2" className="fill-background" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[19px] leading-none tracking-tight",
        className
      )}
    >
      clawmart
    </span>
  );
}

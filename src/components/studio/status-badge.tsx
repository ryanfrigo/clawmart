import { cn } from "@/lib/utils";

type CompanyStatus = "draft" | "building" | "live" | "failed";

/**
 * A stamped rectangle, not a lozenge: 3px radius, a 1px edge in the state
 * colour, a 6px LED, and a mono word. The word matters — colour is never the
 * only channel carrying state.
 *
 * `draft` is sand (scheduled, not yet run) rather than dimmed grey, which the
 * old badge used and which read as broken.
 */
const MAP: Record<
  CompanyStatus,
  { label: string; dot: string; text: string; border: string; heat?: boolean }
> = {
  draft: {
    label: "Draft",
    dot: "bg-sand",
    text: "text-sand",
    border: "border-sand/45",
  },
  building: {
    label: "Building",
    dot: "bg-lobster",
    text: "text-lobster",
    border: "border-lobster/45",
    heat: true,
  },
  live: {
    label: "Live",
    dot: "bg-kelp",
    text: "text-kelp",
    border: "border-kelp/45",
  },
  failed: {
    label: "Failed",
    dot: "bg-destructive",
    text: "text-destructive",
    border: "border-destructive/45",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = MAP[(status as CompanyStatus) in MAP ? (status as CompanyStatus) : "draft"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 font-mono text-[10px] uppercase leading-[1.4] tracking-[0.16em]",
        s.border,
        s.text,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", s.dot, s.heat && "anim-heat")}
      />
      {s.label}
    </span>
  );
}

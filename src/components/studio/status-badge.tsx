import { cn } from "@/lib/utils";

type CompanyStatus = "draft" | "building" | "live" | "failed";

const MAP: Record<
  CompanyStatus,
  { label: string; dot: string; text: string; border: string; pulse?: boolean }
> = {
  draft: {
    label: "Draft",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    border: "border-border",
  },
  building: {
    label: "Building",
    dot: "bg-lobster",
    text: "text-lobster",
    border: "border-lobster/40",
    pulse: true,
  },
  live: {
    label: "Live",
    dot: "bg-kelp",
    text: "text-kelp",
    border: "border-kelp/40",
  },
  failed: {
    label: "Failed",
    dot: "bg-destructive",
    text: "text-destructive",
    border: "border-destructive/40",
  },
};

/** Small status pill for a company, shared across the launcher and build view. */
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em]",
        s.border,
        s.text,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot, s.pulse && "animate-pulse")} />
      {s.label}
    </span>
  );
}

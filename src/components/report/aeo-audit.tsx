import { Check, X } from "lucide-react";

type AeoItem = { id: string; label: string; pass: boolean; detail: string };

export function AeoAudit({ items }: { items: AeoItem[] }) {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card/40">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3.5 p-4 sm:p-5">
          <span
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
              item.pass
                ? "border-kelp/40 bg-kelp/15 text-kelp"
                : "border-destructive/40 bg-destructive/15 text-destructive"
            }`}
            aria-label={item.pass ? "Pass" : "Fail"}
          >
            {item.pass ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium tracking-tight">{item.label}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {item.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

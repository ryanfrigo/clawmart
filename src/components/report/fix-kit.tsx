"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { FixArtifact } from "../../../convex/lib/pure";
import { Button } from "@/components/ui/button";
import { EMERGING_LINE } from "@/components/site/constants";

const MECHANISM_LABEL: Record<FixArtifact["mechanism"], { label: string; cls: string }> = {
  grounded: {
    label: "search-grounded",
    cls: "border-tide/40 bg-tide/10 text-tide",
  },
  parametric: {
    label: "model training",
    cls: "border-sand/40 bg-sand/10 text-sand",
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the text manually.");
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onCopy}
      className="print:hidden"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function FixKit({ fixes }: { fixes: FixArtifact[] }) {
  const ordered = [...fixes].sort((a, b) => a.priority - b.priority);

  return (
    <div>
      <p className="mb-6 rounded-xl border border-border bg-card/40 p-4 text-[13px] leading-relaxed text-muted-foreground">
        {EMERGING_LINE} Each fix below is tagged with its mechanism and an
        honest timeline.
      </p>
      <div className="space-y-5">
        {ordered.map((fix, i) => {
          const mech = MECHANISM_LABEL[fix.mechanism] ?? MECHANISM_LABEL.grounded;
          return (
            <article
              key={fix.id}
              className="overflow-hidden rounded-2xl border border-border bg-card/50"
            >
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-muted-foreground/70">
                    fix {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-[16px] font-semibold tracking-tight">
                    {fix.title}
                  </h3>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ${mech.cls}`}
                    >
                      {mech.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {fix.latencyNote}
                    </span>
                  </div>
                </div>
                <CopyButton text={fix.body} />
              </header>
              <div className="p-5 sm:p-6">
                <p className="font-mono text-[11.5px] text-muted-foreground">
                  paste into: <span className="text-foreground/80">{fix.pasteTarget}</span>
                </p>
                <pre className="print-expand mt-3 max-h-72 overflow-auto rounded-xl border border-border bg-abyss/50 p-4 font-mono text-[12px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {fix.body}
                </pre>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

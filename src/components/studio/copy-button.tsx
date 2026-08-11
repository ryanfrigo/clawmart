"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copy-to-clipboard button used across the marketing kit outputs. */
export function CopyButton({
  text,
  label = "Copy",
  what = "Text",
  className,
}: {
  text: string;
  label?: string;
  what?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function onCopy() {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        toast.success(`${what} copied`);
        setTimeout(() => setCopied(false), 1600);
      },
      () => toast.error("Copy failed")
    );
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border border-[color:var(--rule)] px-2.5 py-1 text-[12px] text-muted-foreground outline-none transition-colors duration-[120ms] hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-kelp" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

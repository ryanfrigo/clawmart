"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { StatusBadge } from "@/components/studio/status-badge";
import { Button } from "@/components/ui/button";

const IDEA_MIN = 20;
const IDEA_MAX = 2000;

const ERRORS: Record<string, string> = {
  unauthenticated: "Please sign in to build a company.",
  idea_too_short: `Add a little more detail — at least ${IDEA_MIN} characters.`,
  idea_too_long: `That's a lot — keep the idea under ${IDEA_MAX} characters.`,
  company_limit: "You've reached the limit of 3 companies. Rebuild an existing one instead.",
  rate_limited: "We've hit today's build limit across the studio. Please try again later.",
};

function CreateForm({ atLimit }: { atLimit: boolean }) {
  const router = useRouter();
  const create = useMutation(api.companies.create);
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);

  const len = idea.trim().length;
  const tooShort = len > 0 && len < IDEA_MIN;
  const canSubmit = len >= IDEA_MIN && len <= IDEA_MAX && !busy && !atLimit;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { companyId } = await create({ idea: idea.trim() });
      router.push(`/studio/${companyId}`);
    } catch (err) {
      const code = err instanceof ConvexError ? String(err.data) : "";
      toast.error(ERRORS[code] ?? "Couldn't start the build. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="idea" className="sr-only">
        Describe your company or SaaS idea
      </label>
      <textarea
        id="idea"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        maxLength={IDEA_MAX}
        rows={5}
        disabled={busy || atLimit}
        placeholder="A scheduling tool for tattoo artists that handles deposits, reminders, and rebooking over text…"
        className="w-full resize-y rounded-xl border border-input bg-transparent px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className={tooShort ? "text-[12px] text-destructive" : "text-[12px] text-muted-foreground"}>
          {tooShort ? `${IDEA_MIN - len} more characters to go` : "The sharper the idea, the sharper the build."}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {len}/{IDEA_MAX}
        </p>
      </div>
      {atLimit && (
        <p className="mt-3 rounded-lg border border-border bg-card/40 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
          You have 3 companies — the current limit. Open one below and rebuild it to try a new
          direction.
        </p>
      )}
      <Button type="submit" size="lg" disabled={!canSubmit} className="mt-4 w-full font-medium">
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Assembling the founding team…
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            Build the company
          </>
        )}
      </Button>
    </form>
  );
}

function CompanyGrid() {
  const companies = useQuery(api.companies.listMine, {});

  if (companies === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="shimmer-line h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center text-[13.5px] text-muted-foreground">
        No companies yet. Describe an idea above and watch the founding team build it.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {companies.map((c) => (
        <div
          key={c._id}
          className="group relative flex flex-col rounded-xl border border-border bg-card/40 p-5 transition-colors hover:border-lobster/40"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl leading-tight tracking-tight">{c.name}</h3>
            <StatusBadge status={c.status} className="shrink-0" />
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {c.tagline ?? c.idea}
          </p>
          <div className="mt-4 flex items-center gap-4 pt-1 text-[13px]">
            <Link
              href={`/studio/${c._id}`}
              className="inline-flex items-center gap-1 font-medium text-foreground/85 transition-colors hover:text-lobster"
            >
              Open build
              <ArrowRight className="size-3.5" />
            </Link>
            {c.status === "live" && (
              <Link
                href={`/c/${c.slug}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Public page
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Auth-gated action area for /studio: sign-in CTA, create form, and the grid. */
export function StudioLauncher() {
  const companies = useQuery(api.companies.listMine, {});
  const atLimit = Array.isArray(companies) && companies.length >= 3;

  return (
    <>
      <SignedOut>
        <div className="rounded-2xl border border-lobster/30 bg-card/50 p-8 text-center">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Sign in to describe an idea and watch a founding team of AI agents draft it — free while
            we validate demand.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" className="mt-5 font-medium">
              Sign in to start building
              <ArrowRight className="size-4" />
            </Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
          <CreateForm atLimit={atLimit} />
        </div>
        <div className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl tracking-tight">Your companies</h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Up to 3
            </p>
          </div>
          <div className="mt-6">
            <CompanyGrid />
          </div>
        </div>
      </SignedIn>
    </>
  );
}

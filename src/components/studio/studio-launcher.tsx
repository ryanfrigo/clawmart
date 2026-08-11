"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { ArrowRight, Dices } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { MAX_COMPANIES_PER_USER } from "../../../convex/lib/roster";
import {
  AnonOnly,
  AuthPending,
  AuthedOnly,
  SignInLink,
  StudioUnavailable,
  authEnabled,
} from "@/components/auth/gate";
import { StatusBadge } from "@/components/studio/status-badge";
import { DictationControl } from "@/components/voice/dictation-control";
import { appendTranscript } from "@/components/voice/transcript";
import { ImportFromOpenWhispr } from "@/components/openwhispr/import-note";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const IDEA_MIN = 20;
const IDEA_MAX = 2000;

const ERRORS: Record<string, string> = {
  unauthenticated: "Please sign in to build a company.",
  idea_too_short: `Add a little more detail — at least ${IDEA_MIN} characters.`,
  idea_too_long: `That's a lot — keep the idea under ${IDEA_MAX} characters.`,
  company_limit: `You've reached the limit of ${MAX_COMPANIES_PER_USER} companies. Rebuild an existing one instead.`,
  rate_limited: "We've hit today's build limit across the studio. Please try again later.",
};

/** Inline field error — a strip with a destructive rule, never a toast. */
function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-2 flex gap-2 border-l-2 border-destructive bg-muted px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90"
    >
      <span className="stamp shrink-0 pt-0.5 text-destructive">Err</span>
      <span>{children}</span>
    </p>
  );
}

function CreateForm({ atLimit }: { atLimit: boolean }) {
  const router = useRouter();
  const create = useMutation(api.companies.create);
  const surprise = useAction(api.agents.surpriseIdea);
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [surprising, setSurprising] = useState(false);

  async function onSurprise() {
    setSurprising(true);
    try {
      const result = await surprise({});
      setIdea(result.idea);
    } catch (err) {
      const code = err instanceof ConvexError ? String(err.data) : "";
      toast.error(
        code === "rate_limited"
          ? "That's a lot of surprises for one day — try again tomorrow."
          : (ERRORS[code] ?? "Couldn't think of one just now. Try again.")
      );
    } finally {
      setSurprising(false);
    }
  }

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
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="idea" className="stamp">
          Your idea
        </label>
        <span className="tnum font-mono text-[11px] text-[color:var(--label)]">
          {len}/{IDEA_MAX}
        </span>
      </div>
      <Textarea
        id="idea"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        maxLength={IDEA_MAX}
        rows={4}
        // Locked while a surprise is in flight too — a late-arriving idea
        // must never overwrite text the user typed in the meantime.
        disabled={busy || atLimit || surprising}
        aria-invalid={tooShort}
        placeholder="A scheduling tool for tattoo artists that handles deposits, reminders, and rebooking over text…"
        className="mt-2"
      />
      {/* Voice is strictly additive: dictation appends to whatever is typed,
          and the textarea above stays fully usable while the mic is open. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <DictationControl
          value={idea}
          onChange={setIdea}
          maxLength={IDEA_MAX}
          disabled={busy || atLimit || surprising}
          fieldLabel="your idea"
        />
        {/* Already dictated this into OpenWhispr? Don't retype it. Appends the
            same way dictation does, so it can never wipe what is typed. */}
        <ImportFromOpenWhispr
          disabled={busy || atLimit || surprising}
          onImport={(text) => setIdea((current) => appendTranscript(current, text, IDEA_MAX))}
        />
      </div>
      {tooShort ? (
        <FieldError>{IDEA_MIN - len} more characters before the team can start.</FieldError>
      ) : (
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          The sharper the idea, the sharper the build.
        </p>
      )}
      {atLimit && (
        <FieldError>
          You have {MAX_COMPANIES_PER_USER} companies — the current limit. Open one below
          and rebuild it to try a new direction.
        </FieldError>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {busy ? "Assembling the founding team…" : "Build the company"}
          {!busy && <ArrowRight className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSurprise}
          disabled={busy || surprising || atLimit}
        >
          <Dices className="size-4" />
          {surprising ? "Thinking…" : "Surprise me"}
        </Button>
      </div>
    </form>
  );
}

/** Auth-gated create form for the hero. The companies list lives in MyCompanies. */
export function StudioLauncher() {
  // Gate BEFORE any hooks: in no-Convex environments there is no
  // ConvexProvider, and useQuery would throw. authEnabled is a build-time
  // constant, so this early return is stable across renders.
  if (!authEnabled) return <StudioUnavailable />;
  return <StudioLauncherInner />;
}

function StudioLauncherInner() {
  const companies = useQuery(api.companies.listMine, {});
  const atLimit = Array.isArray(companies) && companies.length >= MAX_COMPANIES_PER_USER;

  return (
    <>
      {/* Server render and session restore both land here. Without it the hero
          has a hole where its primary action belongs until auth resolves — a
          blank plate at the right size holds the space and says why. */}
      <AuthPending>
        <div className="well flex h-[168px] items-center justify-center">
          <p className="stamp">Restoring session — —</p>
        </div>
      </AuthPending>

      <AnonOnly>
        <div className="plate p-5">
          <p className="stamp">Access</p>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            Sign in to describe an idea and watch a founding team of AI agents draft it.
            Free while we validate demand.
          </p>
          <Button asChild className="mt-4">
            <SignInLink redirect="/">
              Sign in to start building
              <ArrowRight className="size-4" />
            </SignInLink>
          </Button>
        </div>
      </AnonOnly>

      <AuthedOnly>
        <div className="plate p-5">
          <CreateForm atLimit={atLimit} />
        </div>
      </AuthedOnly>
    </>
  );
}

/* ---------------- the companies wall ---------------- */

function CompanyGrid() {
  const companies = useQuery(api.companies.listMine, {});

  // A pending readout is a blank plate at the final dimensions, not a skeleton
  // shimmer. Absence of data is itself telemetry, and it does not animate.
  if (companies === undefined) {
    return (
      <div className="well flex h-32 items-center justify-center">
        <p className="stamp">Reading account — —</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="well flex h-32 items-center justify-center px-6 text-center">
        <p className="stamp">No companies · awaiting an idea</p>
      </div>
    );
  }

  return (
    <div className="seam-wall sm:grid-cols-2 lg:grid-cols-3">
      {companies.map((c) => (
        <div key={c._id} className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-medium leading-tight tracking-tight">{c.name}</h3>
            <StatusBadge status={c.status} className="shrink-0" />
          </div>
          <p className="mt-2 line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
            {c.tagline ?? c.idea}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--border)] pt-3">
            <Link
              href={`/studio/${c._id}`}
              className="rounded-[3px] text-[13px] font-medium text-foreground outline-none transition-colors duration-[120ms] hover:text-foreground"
            >
              Open build →
            </Link>
            {c.status === "live" && (
              <Link
                href={`/c/${c.slug}`}
                className="rounded-[3px] text-[13px] text-muted-foreground outline-none transition-colors duration-[120ms] hover:text-foreground"
              >
                Public page
              </Link>
            )}
            {/* A failed-rebuild page keeps serving and collecting — show the
                signal whenever it exists, not only while "live". */}
            {(c.status === "live" || c.waitlistCount > 0) && (
              <span
                className="tnum ml-auto font-mono text-[11px] text-[color:var(--label)]"
                title="Emails collected by this company's public page"
              >
                {c.waitlistCount > 1000 ? "1,000+" : c.waitlistCount} waitlist
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The owner's companies. Renders nothing at all when signed out, so the
 * homepage can place it as a real section without a hole in the page.
 */
export function MyCompanies({ className }: { className?: string }) {
  if (!authEnabled) return null;
  return (
    <AuthedOnly>
      <section id="companies" className={cn("scroll-mt-16", className)}>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--rule)] pb-3">
          <h2 className="stamp-lg text-foreground">Your companies</h2>
          <p className="stamp">Up to {MAX_COMPANIES_PER_USER} per account</p>
        </div>
        <div className="mt-5">
          <CompanyGrid />
        </div>
      </section>
    </AuthedOnly>
  );
}

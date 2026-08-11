"use client";

/**
 * The door to the factory floor. Ours, not a vendor's modal.
 *
 * It lives OUTSIDE the (site) route group on purpose: no nav, no footer, full
 * viewport. Signing in is powering up the console, so the left ground is the
 * founding-team pipeline with every LED dark, and it lights column by column
 * on success before the redirect.
 *
 * Every number on this screen is a count of our own roster, imported from
 * convex/lib (pure modules, no Convex imports). There is no usage figure, no
 * customer count, and no testimonial here, and there must never be one — this
 * company is pre-launch (CLAUDE.md trust rules).
 */

import { Suspense, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { PIPELINE, AGENTS } from "../../../convex/lib/agents";
import { DIVISIONS, MAX_TASKS, ROSTER } from "../../../convex/lib/roster";
import { authEnabled } from "@/components/auth/gate";
import { ClawMark, Wordmark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Mirrors convex/auth.ts PASSWORD_MIN — the server re-checks it regardless. */
const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/** How long the ignition runs before we navigate. Bounded; never blocking. */
const IGNITION_MS = 600;

type Flow = "signIn" | "signUp";

/**
 * Only a redirect back into this app is honoured. A `?redirect=` that a
 * stranger controls is an open-redirect otherwise, and sign-in is exactly the
 * page an attacker would aim one at.
 */
function safeRedirect(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

/**
 * Turns a failure into a sentence a person can act on.
 *
 * Convex preserves ConvexError data across the wire but replaces the message of
 * an ordinary Error in production, so the two structured cases we control
 * (convex/auth.ts) come back as codes and everything else is inferred from the
 * flow. We never say which of "no such account" / "wrong password" it was —
 * that distinction is an account-enumeration oracle, and it is not useful to
 * the person who typed it either.
 */
function errorMessage(err: unknown, flow: Flow): string {
  if (err instanceof ConvexError) {
    const code = String(err.data);
    if (code === "invalid_email") return "That doesn't look like an email address.";
    if (code === "weak_password")
      return `Passwords need at least ${PASSWORD_MIN} characters.`;
    // Both come from the signUp guard in convex/auth.ts. "email_taken" is
    // returned before any password is checked, so this message reads the same
    // whether or not the caller guessed one — it leaks nothing extra.
    if (code === "email_taken") return "That email is already registered. Sign in instead.";
    if (code === "rate_limited")
      return "Too many sign-up attempts. Wait an hour and try again.";
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You appear to be offline. Check your connection and try again.";
  }

  const raw = err instanceof Error ? err.message : "";
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (/already exists/i.test(raw)) {
    return "That email is already registered. Sign in instead.";
  }

  return flow === "signIn"
    ? "That email and password don't match an account."
    : "Couldn't create that account — the email may already be registered. Try signing in.";
}

/* --------------------------------------------------------------------------
   The ground: the founding team, as a static pipeline with dark LEDs.
   Same five agents, same model ids the engine actually calls.
   -------------------------------------------------------------------------- */

function IgnitionFigure({ litCount }: { litCount: number }) {
  return (
    <figure className="w-full max-w-[420px]">
      <ol className="seam-wall" aria-hidden="true">
        {PIPELINE.map((key, i) => {
          const agent = AGENTS[key];
          const lit = i < litCount;
          return (
            <li key={key} className="flex items-center gap-3 px-4 py-3">
              <span
                className={
                  lit
                    ? "size-[6px] shrink-0 rounded-full bg-lobster"
                    : "size-[6px] shrink-0 rounded-full bg-[color:var(--rule)]"
                }
              />
              <span className="stamp w-6 shrink-0 text-tide">T{i + 1}</span>
              <span className="flex-1 truncate text-[13.5px] font-medium">
                {agent.title}
              </span>
              <span className="truncate font-mono text-[11px] text-[color:var(--label)]">
                {agent.model}
              </span>
            </li>
          );
        })}
      </ol>
      <figcaption className="stamp mt-3">
        {litCount === 0 ? "System idle · awaiting operator" : "Bringing the console up"}
      </figcaption>
    </figure>
  );
}

function SpecRow() {
  // Counts of our own roster, read from the repo. Not usage. Not social proof.
  const specs = [
    [`${ROSTER.length}`, "Specialists"],
    [`${DIVISIONS.length}`, "Divisions"],
    [`${PIPELINE.length}`, "Founding agents"],
    [`${MAX_TASKS}`, "Tasks / mission"],
  ] as const;
  return (
    <dl className="mt-8 grid max-w-[420px] grid-cols-4 border-t border-[color:var(--rule)] pt-4">
      {specs.map(([value, label]) => (
        <div key={label}>
          <dt className="stamp">{label}</dt>
          <dd className="tnum mt-1 font-mono text-[15px] text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get("redirect"));

  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();

  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [litCount, setLitCount] = useState(0);

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Already signed in (or a second tab just signed in): leave immediately.
  useEffect(() => {
    if (isAuthenticated) router.replace(redirect);
  }, [isAuthenticated, redirect, router]);

  // Focus the first field on load and whenever the flow flips, so the keyboard
  // never lands somewhere the user has to hunt for.
  useEffect(() => {
    emailRef.current?.focus();
  }, [flow]);

  // Move focus to the error so a screen reader and a sighted user learn about
  // it the same way. aria-live covers the case where focus is elsewhere.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError("That doesn't look like an email address.");
      return;
    }
    if (flow === "signUp" && password.length < PASSWORD_MIN) {
      setError(`Passwords need at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await signIn("password", { email: trimmed, password, flow });
      // Ignition: light the pipeline column by column, then go. The redirect is
      // never gated on the animation finishing — see the timeout below.
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        router.replace(redirect);
        return;
      }
      const step = IGNITION_MS / PIPELINE.length;
      PIPELINE.forEach((_, i) => {
        window.setTimeout(() => setLitCount(i + 1), step * i);
      });
      window.setTimeout(() => router.replace(redirect), IGNITION_MS);
    } catch (err) {
      setError(errorMessage(err, flow));
      setBusy(false);
    }
  }

  const otherFlow: Flow = flow === "signIn" ? "signUp" : "signIn";

  return (
    <div className="grid min-h-screen lg:grid-cols-[58fr_42fr]">
      {/* The ground. Decorative on small screens, so it simply isn't there. */}
      <aside className="well grid-paper relative hidden flex-col justify-between rounded-none border-0 p-10 lg:flex">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-[2px] bg-lobster"
        />
        <Link href="/" className="inline-flex w-fit items-center gap-2">
          <ClawMark className="size-6" />
          <Wordmark />
        </Link>
        <div className="-mt-10">
          <IgnitionFigure litCount={litCount} />
          <SpecRow />
        </div>
        <p className="stamp">Clawmart Studio · agent factory</p>
      </aside>

      {/* The door. */}
      <main className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px] lg:-mt-[8vh]">
          <p className="stamp text-lobster">Access</p>
          <h1 className="d2 mt-3">{flow === "signIn" ? "Sign in." : "Create account."}</h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {flow === "signIn"
              ? "Your companies and missions are private to this account."
              : `Email and a password of at least ${PASSWORD_MIN} characters. That's all we ask for.`}
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-8">
            <label htmlFor={emailId} className="stamp block">
              Email
            </label>
            <Input
              id={emailId}
              ref={emailRef}
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={busy}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className="mt-2"
            />

            <label htmlFor={passwordId} className="stamp mt-5 block">
              Password
            </label>
            <Input
              id={passwordId}
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              required
              minLength={flow === "signUp" ? PASSWORD_MIN : undefined}
              disabled={busy}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className="mt-2"
            />

            {/* Inline, under the fields. Never a toast — a toast for a form
                error is a message that leaves before it can be acted on. */}
            <div aria-live="polite">
              {error && (
                <p
                  id={errorId}
                  ref={errorRef}
                  tabIndex={-1}
                  className="mt-4 flex gap-2 border-l-2 border-destructive bg-muted px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90 outline-none"
                >
                  <span className="stamp shrink-0 pt-0.5 text-destructive">Err</span>
                  <span>{error}</span>
                </p>
              )}
            </div>

            <Button type="submit" disabled={busy} className="mt-6">
              {busy ? (
                <>
                  <span className="size-[6px] rounded-full bg-current anim-heat" />
                  Authenticating…
                </>
              ) : (
                <>{flow === "signIn" ? "Continue ↵" : "Create account ↵"}</>
              )}
            </Button>
          </form>

          <p className="mt-6 text-[13px] text-muted-foreground">
            {flow === "signIn" ? "No account yet? " : "Already have an account? "}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFlow(otherFlow);
                setError(null);
              }}
              className="font-mono text-[12.5px] text-foreground underline underline-offset-4 hover:text-lobster disabled:opacity-50"
            >
              {flow === "signIn" ? "Create one" : "Sign in"}
            </button>
          </p>

          <div className="mt-10 border-t border-[color:var(--rule)] pt-5">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              We store your email, a hash of your password, and the companies you
              build. See{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
                Terms
              </Link>
              .
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              Clawmart Studio drafts companies with AI. Everything the agents
              produce is a labeled draft you review — not validated work, and not
              business, legal, or financial advice.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/** No deployment configured: say so plainly rather than render a dead form. */
function SignInUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="plate max-w-md p-8 text-center">
        <p className="stamp">No signal</p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          Accounts aren&apos;t configured in this environment, so there is
          nothing to sign in to. The rest of the site works normally.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block font-mono text-[12.5px] underline underline-offset-4"
        >
          Back to Clawmart
        </Link>
      </div>
    </main>
  );
}

export default function SignInPage() {
  if (!authEnabled) return <SignInUnavailable />;
  // useSearchParams needs a Suspense boundary to keep the route static-friendly.
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SignInForm />
    </Suspense>
  );
}

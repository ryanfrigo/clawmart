"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import {
  AnonOnly,
  AuthedOnly,
  AuthPending,
  SignInLink,
  authEnabled,
} from "@/components/auth/gate";

/**
 * The auth corner of the nav: an operator chip, not an avatar bubble.
 *
 * A dark LED and a mono address is a machine reporting who is at the console.
 * Signed out it is a hairline ghost link — the page's one lobster belongs to
 * whatever the page is actually for, never to the nav.
 */
export function NavAuth() {
  // Gate BEFORE any hook. Without a Convex deployment there is no provider and
  // useQuery/useAuthActions would throw; authEnabled is a build-time constant,
  // so this early return can never reorder hooks between renders.
  if (!authEnabled) return null;
  return <NavAuthInner />;
}

function NavAuthInner() {
  return (
    <>
      <AuthPending>
        <span className="stamp px-2" aria-label="Checking your session">
          — —
        </span>
      </AuthPending>
      <AnonOnly>
        <SignInLink className="ml-1 inline-flex h-8 items-center rounded-[3px] border border-[color:var(--rule)] px-3 text-[12.5px] text-foreground transition-colors hover:bg-accent">
          Sign in
        </SignInLink>
      </AnonOnly>
      <AuthedOnly>
        <OperatorChip />
      </AuthedOnly>
    </>
  );
}

function OperatorChip() {
  const viewer = useQuery(api.auth.viewer, {});
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Escape closes and returns focus; a click or a tab out of the chip closes it.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(true);
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  // The address before the @ — enough to identify the operator, short enough to
  // sit in a 52px nav. `— —` while the query is in flight: a pending readout is
  // a dark instrument, not a shimmer.
  const handle = viewer?.email ? viewer.email.split("@")[0] : null;

  return (
    <div ref={rootRef} className="relative ml-1">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-2 rounded-[3px] border border-[color:var(--rule)] px-2.5 transition-colors hover:bg-accent"
      >
        <span className="size-[6px] shrink-0 rounded-full bg-kelp" aria-hidden="true" />
        <span className="max-w-[11ch] truncate font-mono text-[11.5px] text-foreground">
          {handle ?? "— —"}
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-1 w-44 rounded-[3px] border border-[color:var(--rule)] bg-popover py-1 shadow-none"
        >
          <Link
            href="/#companies"
            role="menuitem"
            onClick={() => close(false)}
            className="block px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
          >
            My companies
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close(false);
              void signOut();
            }}
            className="block w-full px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-accent"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

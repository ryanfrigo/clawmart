"use client";

/**
 * "Import from OpenWhispr" — pick a note you already dictated and drop it into
 * the idea box.
 *
 * The whole point of OpenWhispr is that people talk their thinking into it. If
 * you already said the idea out loud, retyping it here is the worst part of
 * this product. docs/OPENWHISPR.md explains why this is the integration that
 * exists: their cloud API serves notes and has no audio endpoint, and the app
 * itself is Electron, so it cannot transcribe for a web page.
 *
 * The key stays in this browser — read from localStorage, sent straight to
 * api.openwhispr.com, never posted to a Clawmart server. We do not want to be a
 * place worth breaching for someone else's credentials.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  KEY_STORAGE,
  fetchNotes,
  isValidKeyShape,
  maskKey,
  type WhisprNote,
} from "@/lib/openwhispr";

type Phase = "idle" | "key" | "loading" | "list" | "error";

export function ImportFromOpenWhispr({
  onImport,
  disabled,
}: {
  onImport: (text: string) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [key, setKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [notes, setNotes] = useState<WhisprNote[]>([]);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  // Only abort in-flight work on unmount. The stored key is read lazily in
  // open() rather than synced into state here: an effect that immediately
  // setStates causes a cascading render, and the key is not needed until the
  // panel is actually opened.
  useEffect(() => () => abort.current?.abort(), []);

  const load = useCallback(async (withKey: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase("loading");
    setError("");
    try {
      const page = await fetchNotes(withKey, { limit: 15, signal: controller.signal });
      if (controller.signal.aborted) return;
      setNotes(page.notes);
      setPhase("list");
    } catch (err) {
      if (controller.signal.aborted) return;
      // fetchNotes throws messages already written for a person to read.
      setError(err instanceof Error ? err.message : "Couldn't reach OpenWhispr.");
      setPhase("error");
    }
  }, []);

  function open() {
    const stored = key || window.localStorage.getItem(KEY_STORAGE) || "";
    if (stored) {
      setKey(stored);
      void load(stored);
    } else {
      setPhase("key");
    }
  }

  function saveKey() {
    const k = draftKey.trim();
    if (!isValidKeyShape(k)) {
      setError("That doesn't look like an OpenWhispr key (owk_live_… or ow_wks_live_…).");
      setPhase("error");
      return;
    }
    window.localStorage.setItem(KEY_STORAGE, k);
    setKey(k);
    setDraftKey("");
    void load(k);
  }

  function forget() {
    window.localStorage.removeItem(KEY_STORAGE);
    setKey("");
    setNotes([]);
    setPhase("idle");
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
      >
        Import from OpenWhispr
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-rule bg-well p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-label">
          OpenWhispr {key ? `· ${maskKey(key)}` : ""}
        </p>
        <button
          type="button"
          onClick={() => setPhase("idle")}
          aria-label="Close OpenWhispr import"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {phase === "key" && (
        <div className="mt-2 space-y-2">
          <label htmlFor="ow-key" className="block text-[12px] text-muted-foreground">
            Paste an API key from the OpenWhispr desktop app (Integrations → API). It stays in
            this browser and is never sent to Clawmart.
          </label>
          <div className="flex gap-2">
            <Input
              id="ow-key"
              type="password"
              autoComplete="off"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="owk_live_…"
              className="h-8 font-mono text-[12px]"
            />
            <Button type="button" size="sm" onClick={saveKey} disabled={!draftKey.trim()}>
              Connect
            </Button>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Reading your notes…
        </p>
      )}

      {phase === "list" &&
        (notes.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted-foreground">
            No notes came back. Dictate one in OpenWhispr and try again.
          </p>
        ) : (
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => {
                    onImport(note.text);
                    setPhase("idle");
                  }}
                  className="w-full rounded border border-transparent px-2 py-1.5 text-left hover:border-rule hover:bg-accent"
                >
                  <span className="block truncate text-[13px] text-foreground">{note.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {note.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {phase === "error" && (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      {key && phase !== "key" && (
        <button
          type="button"
          onClick={forget}
          className="mt-2 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forget this key
        </button>
      )}
    </div>
  );
}

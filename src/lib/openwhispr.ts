/**
 * OpenWhispr note import — pull a dictated note in as a company idea or a
 * mission goal.
 *
 * Why this shape (docs/OPENWHISPR.md has the full assessment): OpenWhispr is an
 * Electron desktop app, so it cannot transcribe for a web page, and its cloud
 * API exposes no audio endpoint. What it DOES expose is the notes a user has
 * already dictated — which is exactly our input. Someone who talks their
 * thinking into OpenWhispr all day should not have to retype it here.
 *
 * THE KEY NEVER TOUCHES OUR SERVER. It lives in localStorage and goes straight
 * from the browser to api.openwhispr.com. That is deliberate: holding other
 * people's third-party credentials would mean encrypted per-user secret
 * storage, a rotation story, and a breach surface — all to save one paste. The
 * cost is that we depend on OpenWhispr sending permissive CORS headers, which
 * their docs do not specify; describeFailure turns that into a plain
 * explanation rather than a silent nothing.
 *
 * Contract, from https://docs.openwhispr.com/api/overview:
 *   GET {BASE}/notes/list?limit=&cursor=   Authorization: Bearer <key>
 *   -> { data: [...], has_more: boolean, next_cursor: string }
 *   errors -> { error: { code, message } }
 *
 * NOT VERIFIED AGAINST A LIVE ACCOUNT — we hold no OpenWhispr key. Every rule
 * below is written from the published contract and unit-tested against it. The
 * first real key is the first end-to-end proof.
 */

export const OPENWHISPR_BASE = "https://api.openwhispr.com/api/v1";
export const KEY_STORAGE = "clawmart.openwhispr.key";

/** Documented key shapes: personal (`owk_live_`) and workspace (`ow_wks_live_`). */
const KEY_RE = /^(owk_live_|ow_wks_live_)[A-Za-z0-9._-]{8,}$/;

export function isValidKeyShape(key: string): boolean {
  return KEY_RE.test(key.trim());
}

/**
 * Never render a key back in full. A UI that echoes a credential teaches people
 * it is safe to screenshot.
 */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 12) return "•".repeat(k.length);
  return `${k.slice(0, 8)}…${k.slice(-4)}`;
}

export interface WhisprNote {
  id: string;
  title: string;
  text: string;
  createdAt: number | null;
}

export interface NotePage {
  notes: WhisprNote[];
  nextCursor: string | null;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Coerce one API row into a note we can use.
 *
 * The docs name the envelope but not the row fields, so we accept the obvious
 * aliases rather than betting on one and breaking against the first real
 * account. A row with no usable text is dropped, not shown as an empty option.
 */
export function parseNote(raw: unknown): WhisprNote | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const id = str(r.id) || str(r.note_id) || str(r.uuid);
  const text = (str(r.text) || str(r.content) || str(r.body) || str(r.transcript)).trim();
  if (!id || !text) return null;

  const created = r.created_at ?? r.createdAt ?? r.created;
  const createdAt =
    typeof created === "number"
      ? created
      : typeof created === "string" && Number.isFinite(Date.parse(created))
        ? Date.parse(created)
        : null;

  return {
    id,
    // Fall back to the opening words so a note always has something to click.
    title: (str(r.title) || str(r.name) || text.slice(0, 60)).trim(),
    text,
    createdAt,
  };
}

/** Parse a `/notes/list` body into rows plus the opaque cursor to send back. */
export function parseNotePage(body: unknown): NotePage {
  if (typeof body !== "object" || body === null) return { notes: [], nextCursor: null };
  const b = body as Record<string, unknown>;
  const rows = Array.isArray(b.data) ? b.data : [];
  const notes = rows.map(parseNote).filter((n): n is WhisprNote => n !== null);
  // "Treat next_cursor as an opaque token — pass it back exactly as received."
  const nextCursor = b.has_more === true && typeof b.next_cursor === "string" ? b.next_cursor : null;
  return { notes, nextCursor };
}

/** Turn an API error body / HTTP status into something a person can act on. */
export function describeError(status: number, body: unknown): string {
  const code =
    typeof body === "object" && body !== null
      ? str((((body as Record<string, unknown>).error as Record<string, unknown>) ?? {}).code)
      : "";

  if (status === 401 || status === 403 || code === "unauthorized") {
    return "OpenWhispr rejected that key. Generate a fresh one in the desktop app under Integrations → API.";
  }
  if (status === 429 || code === "rate_limited") {
    return "OpenWhispr is rate-limiting this key. Wait a moment and try again.";
  }
  if (status >= 500) return "OpenWhispr's API is having trouble. Try again shortly.";
  return "Couldn't read your notes from OpenWhispr.";
}

/**
 * A failed fetch to a third-party origin is almost always CORS, and the browser
 * deliberately hides that from script. Saying so is more useful than "network
 * error": the user cannot fix it, and should not go regenerate a working key.
 */
export function describeFailure(): string {
  return "Couldn't reach OpenWhispr from the browser. Their API may not allow direct browser requests — paste your note in instead.";
}

/** One page of notes. Throws an Error whose message is already fit to display. */
export async function fetchNotes(
  key: string,
  options: { cursor?: string | null; limit?: number; signal?: AbortSignal } = {}
): Promise<NotePage> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 20) });
  if (options.cursor) params.set("cursor", options.cursor);

  let res: Response;
  try {
    res = await fetch(`${OPENWHISPR_BASE}/notes/list?${params}`, {
      headers: { authorization: `Bearer ${key.trim()}` },
      signal: options.signal,
    });
  } catch {
    throw new Error(describeFailure());
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(describeError(res.status, body));
  return parseNotePage(body);
}

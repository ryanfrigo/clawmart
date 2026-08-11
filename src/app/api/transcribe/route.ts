import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { MAX_AUDIO_BYTES, audioFormatFromMime } from "@/components/voice/audio";
import { cleanModelTranscript } from "@/components/voice/transcript";

/**
 * POST /api/transcribe — dictation fallback for browsers with no Web Speech API
 * (in practice: Firefox). Chrome, Edge and Safari never reach this route; they
 * transcribe in-browser and the audio never touches our infrastructure.
 *
 * Idea credit: OpenWhispr (MIT, github.com/OpenWhispr/openwhispr). It is an
 * Electron app with no web SDK, so this is a clean-room server route, not a
 * port. See docs/VOICE-INPUT.md.
 *
 * Request:  raw audio bytes, `Content-Type` = the MediaRecorder mimeType.
 * Response: `{ text }` on success, `{ error: <code> }` otherwise. The codes are
 *           the ones use-voice-input.ts maps to user-facing copy.
 *
 * ON WHISPER: OpenRouter has no /v1/audio/transcriptions endpoint and does not
 * serve Whisper. Audio goes in as a base64 `input_audio` part on an ordinary
 * chat completion, transcribed by an audio-capable model. That is a real
 * difference from a dedicated ASR model and the UI says so rather than
 * claiming accuracy we have not measured.
 *
 * Handling rules, in order of how badly they'd bite:
 *  - Nothing here is logged except a status code. Not the audio, not a
 *    transcript, not the key, not the key's error body.
 *  - Auth first, before a single byte is read.
 *  - Size is capped twice: the declared Content-Length, then the real payload.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Same audio-capable model the Studio pipeline already uses for worker steps.
const TRANSCRIBE_MODEL = "google/gemini-2.5-flash";
const UPSTREAM_TIMEOUT_MS = 45_000;
const MAX_TRANSCRIPT_CHARS = 2_000;

const PROMPT =
  "Transcribe the speech in this audio verbatim. Return only the transcript, with no preamble, " +
  "no quotation marks, and no commentary. If there is no intelligible speech, return nothing.";

/* ---------------- rate limit ---------------- */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_USER_PER_WINDOW = 30;
const MAX_TRACKED_USERS = 1_000;

/**
 * Per-instance sliding window. Serverless means this is best-effort — a user
 * spread across cold instances gets a higher effective ceiling — so it is a
 * flood guard, not a billing control. The real cost guardrails are the 2-minute
 * client recording cap and the 4 MB body cap, which bound any single call.
 * If dictation ever becomes load-bearing this should move to the Convex
 * `rateLimits` table like every other limit in the codebase.
 */
const buckets = new Map<string, { windowStart: number; count: number }>();

function overRateLimit(userId: string): boolean {
  const now = Date.now();
  if (buckets.size > MAX_TRACKED_USERS) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
    }
  }
  const bucket = buckets.get(userId);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(userId, { windowStart: now, count: 1 });
    return false;
  }
  if (bucket.count >= MAX_PER_USER_PER_WINDOW) return true;
  bucket.count += 1;
  return false;
}

/* ---------------- helpers ---------------- */

function fail(error: string, status: number): NextResponse {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}

/**
 * Identify the caller from the Convex Auth token the client sends as a bearer
 * header, by asking Convex who it belongs to. Convex verifies the JWT against
 * the deployment's own JWKS — this route never parses or trusts a token itself.
 *
 * Returns the durable `Id<"users">`, never the JWT `sub`: Convex Auth mints
 * `sub` as "<userId>|<sessionId>", so it changes on every new session and would
 * hand a user a fresh rate-limit bucket on every sign-in.
 */
async function currentUserId(request: NextRequest): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url || url.includes("placeholder")) return null;

  try {
    // A client per request, deliberately. setAuth() on a module-level singleton
    // would leak one caller's identity into whoever's request lands next.
    const client = new ConvexHttpClient(url);
    client.setAuth(token);
    const viewer = await client.query(api.auth.viewer, {});
    return viewer?.id ?? null;
  } catch {
    // Expired, forged, or a Convex hiccup — all of them mean "not authorized".
    return null;
  }
}

/* ---------------- handler ---------------- */

export async function POST(request: NextRequest) {
  const userId = await currentUserId(request);
  if (!userId) return fail("unauthenticated", 401);

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return fail("not_configured", 503);

  const format = audioFormatFromMime(request.headers.get("content-type") ?? "");
  if (!format) return fail("unsupported_format", 415);

  // Cheap rejection before reading the body at all.
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES) return fail("too_large", 413);

  if (overRateLimit(userId)) return fail("rate_limited", 429);

  let bytes: ArrayBuffer;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    return fail("bad_request", 400);
  }
  // Content-Length can lie; this is the check that counts.
  if (bytes.byteLength > MAX_AUDIO_BYTES) return fail("too_large", 413);
  if (bytes.byteLength === 0) return fail("empty", 400);

  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      : undefined;

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "http-referer": "https://clawmart.co",
        "x-title": "Clawmart Studio",
      },
      body: JSON.stringify({
        model: TRANSCRIBE_MODEL,
        temperature: 0,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "input_audio",
                input_audio: { data: Buffer.from(bytes).toString("base64"), format },
              },
            ],
          },
        ],
      }),
    });
  } catch {
    // No detail logged: an upstream error body can echo the request headers.
    console.error("transcribe: upstream request failed");
    return fail("upstream_failed", 502);
  }

  if (!res.ok) {
    // Status only. The body may contain the key or the audio we just sent.
    console.error(`transcribe: upstream status ${res.status}`);
    return fail("upstream_failed", 502);
  }

  let text: string;
  try {
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    text = cleanModelTranscript(data.choices?.[0]?.message?.content ?? "");
  } catch {
    console.error("transcribe: unreadable upstream response");
    return fail("upstream_failed", 502);
  }

  if (!text) return fail("empty", 422);

  return NextResponse.json(
    { text: text.slice(0, MAX_TRANSCRIPT_CHARS) },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}

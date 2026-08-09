/**
 * Model router — free-inference-first routing for the agent army.
 *
 * Why this exists
 * ---------------
 * The founding-team pipeline makes 5 model calls per company. An army makes up
 * to 8 per mission across many missions, so the cost curve is completely
 * different: routing has to prefer free capacity and degrade gracefully instead
 * of failing when a free endpoint is rate-limited (they rate-limit constantly).
 *
 * The design follows OmniRoute (MIT): a routing strategy resolves to an ordered
 * FALLBACK CHAIN of models, and a per-model circuit breaker takes a model out
 * of rotation after failures with exponential backoff. Two deliberate
 * simplifications versus OmniRoute proper — we run inside short-lived Convex
 * actions, not a long-lived gateway process, so:
 *   1. breaker state is persisted (a `modelHealth` row), not in-process; and
 *   2. the caller owns the retry loop, keeping this module unit-testable.
 *
 * Provider policy (CLAUDE.md): OpenRouter is the default and only configured
 * upstream. OMNIROUTE_BASE_URL is an opt-in self-hosted OmniRoute gateway —
 * OpenAI-compatible, so it is the same code path with a different base URL.
 * Vercel AI Gateway is never used. Keys live in Convex env only.
 */

import type { ChatMessage, Tier } from "./roster";
import { WORKER_MODEL as WORKER, PREMIUM_MODEL as PREMIUM } from "./agents";

export const STRATEGIES = ["free", "balanced", "quality"] as const;
export type Strategy = (typeof STRATEGIES)[number];

export const STRATEGY_LABELS: Record<Strategy, string> = {
  free: "Free tier — zero-cost models, slower and occasionally rate-limited",
  balanced: "Balanced — free models first, paid fallback if they stumble",
  quality: "Quality — premium models for the work that compounds",
};

// Paid models are shared with the founding-team pipeline rather than restated,
// so the two surfaces can never drift onto different models. Both ids verified
// live on 2026-08-09. Re-exported because the chain logic and its tests both
// reason in terms of them.
export { WORKER_MODEL, PREMIUM_MODEL } from "./agents";

/**
 * Zero-cost OpenRouter models, best-first.
 *
 * VERIFIED against GET https://openrouter.ai/api/v1/models on 2026-08-09 — of
 * 400 catalog entries only 14 are `:free`, and the set turns over fast (every
 * id from six months earlier was already gone). Re-check before trusting this
 * list; that churn is exactly why:
 *   - CLAWMART_FREE_MODELS overrides it without a deploy, and
 *   - a dead id merely fails its attempt, trips its breaker, and the chain
 *     moves on, so a stale entry degrades instead of breaking.
 *
 * Ordered by expected instruction-following quality on our JSON-envelope task,
 * with a small fast model last as the cheapest retry. Vision-only, reasoning-
 * omni, content-safety, and code-only endpoints are deliberately excluded —
 * they do worse at the structured-output contract every roster agent must meet.
 */
export const DEFAULT_FREE_MODELS: readonly string[] = [
  "nvidia/nemotron-3-super-120b-a12b:free", // 262k ctx, strong general instruct
  "openai/gpt-oss-20b:free", // 131k ctx, reliable JSON
  "google/gemma-4-31b-it:free", // 262k ctx, instruction-tuned
  "nvidia/nemotron-3-ultra-550b-a55b:free", // 1M ctx, highest quality, slowest
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-9b-v2:free", // 128k ctx, fast last-resort
];

export function freeModels(): string[] {
  const raw = process.env.CLAWMART_FREE_MODELS;
  if (!raw) return [...DEFAULT_FREE_MODELS];
  const parsed = raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_FREE_MODELS];
}

/** Longest chain we will attempt for one task, across all tiers. */
export const MAX_CHAIN = 4;

/**
 * Resolve (strategy, tier) to an ordered list of models to try.
 *
 * `cooledDown` is the set of models currently in breaker cooldown; they are
 * filtered out, EXCEPT that the chain is never allowed to become empty — a
 * fully-cooled chain still tries its first choice rather than failing the task
 * without making a single request.
 */
export function chooseChain(
  strategy: Strategy,
  tier: Tier,
  cooledDown: ReadonlySet<string> = new Set()
): string[] {
  const free = freeModels();
  const paid = tier === "premium" ? PREMIUM : WORKER;

  let chain: string[];
  switch (strategy) {
    case "free":
      // Free only — no paid fallback, so a "free" mission can never bill.
      chain = free;
      break;
    case "quality":
      // Premium first; the cheap paid model is the safety net, never a free one.
      chain = tier === "premium" ? [PREMIUM, WORKER] : [WORKER, PREMIUM];
      break;
    case "balanced":
    default:
      // Free capacity first, paid model as the guarantee of completion.
      chain = [...free, paid];
      break;
  }

  chain = Array.from(new Set(chain)).slice(0, MAX_CHAIN);
  const healthy = chain.filter((m) => !cooledDown.has(m));
  // Never return an empty chain: attempting a cooled model beats not trying.
  return healthy.length > 0 ? healthy : chain.slice(0, 1);
}

// ---------------------------------------------------------------------------
// Circuit breaker maths (pure)
// ---------------------------------------------------------------------------

export const COOLDOWN_BASE_MS = 60_000; // 1 min after the first failure
export const COOLDOWN_MAX_MS = 30 * 60_000; // capped at 30 min

/**
 * Exponential backoff on consecutive failures: 1m, 2m, 4m, 8m, 16m, 30m...
 * `failures` is the count INCLUDING the one being recorded.
 */
export function nextCooldownMs(failures: number): number {
  if (failures <= 0) return 0;
  const exp = COOLDOWN_BASE_MS * Math.pow(2, Math.min(failures - 1, 10));
  return Math.min(exp, COOLDOWN_MAX_MS);
}

/** A 429 with a Retry-After header is authoritative — honor it over backoff. */
export function retryAfterMs(header: string | null, now: number = Date.now()): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  if (!trimmed) return undefined;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, COOLDOWN_MAX_MS);
  }
  const date = Date.parse(trimmed);
  if (Number.isFinite(date)) {
    return Math.min(Math.max(date - now, 0), COOLDOWN_MAX_MS);
  }
  return undefined;
}

/**
 * Whether a failure is worth trying the next model in the chain.
 *
 * Auth/billing errors (401/402/403) mean OUR credentials are wrong — every
 * model behind that key fails identically, so burning the chain is pure waste.
 */
export function isChainWorthy(status?: number): boolean {
  if (status === undefined) return true; // network/timeout — try the next model
  return status !== 401 && status !== 402 && status !== 403;
}

// ---------------------------------------------------------------------------
// The call itself
// ---------------------------------------------------------------------------

export interface ModelResult {
  text: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
}

export class ModelCallError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cooldownHintMs?: number
  ) {
    super(message);
    this.name = "ModelCallError";
  }
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface Upstream {
  url: string;
  key: string;
  headers: Record<string, string>;
}

/**
 * Pick the upstream gateway. OmniRoute if self-hosted and configured, else
 * OpenRouter. Both speak the OpenAI chat-completions wire format.
 */
export function resolveUpstream(): Upstream {
  const omni = process.env.OMNIROUTE_BASE_URL?.trim();
  if (omni) {
    const base = omni.replace(/\/+$/, "");
    return {
      // OMNIROUTE_BASE_URL is given as the OpenAI-compatible root (".../v1").
      url: `${base}/chat/completions`,
      key: process.env.OMNIROUTE_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "",
      headers: {
        // Ask the gateway to prefer cheap capacity when it does its own routing.
        "x-omniroute-combo": "auto/cheap",
      },
    };
  }
  return {
    url: OPENROUTER_URL,
    key: process.env.OPENROUTER_API_KEY ?? "",
    headers: {
      "http-referer": "https://clawmart.co",
      "x-title": "Clawmart Agency",
    },
  };
}

/**
 * One model call. Throws ModelCallError carrying the upstream status so the
 * caller can decide whether to advance the chain and how long to cool the
 * model down.
 */
export async function callModel(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  timeoutMs = 90_000
): Promise<ModelResult> {
  const upstream = resolveUpstream();
  if (!upstream.key) throw new ModelCallError("no model API key is configured", 401);

  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

  let res: Response;
  try {
    res = await fetch(upstream.url, {
      method: "POST",
      signal,
      headers: {
        authorization: `Bearer ${upstream.key}`,
        "content-type": "application/json",
        ...upstream.headers,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    // Timeout or transport failure — no status, so the chain should advance.
    throw new ModelCallError(`${model}: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ModelCallError(
      `${model} -> ${res.status}: ${body.slice(0, 200)}`,
      res.status,
      res.status === 429 ? retryAfterMs(res.headers.get("retry-after")) : undefined
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    // Free endpoints love returning 200 with an error body or an empty choice.
    throw new ModelCallError(
      `${model}: empty completion${data.error?.message ? ` (${data.error.message.slice(0, 120)})` : ""}`
    );
  }

  return {
    text,
    model,
    tokensIn: data.usage?.prompt_tokens,
    tokensOut: data.usage?.completion_tokens,
  };
}

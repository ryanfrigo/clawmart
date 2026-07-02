/**
 * LLM gateway client for Convex actions.
 *
 * - live mode: Vercel AI Gateway (AI_GATEWAY_API_KEY from Convex env — OIDC is
 *   impossible in Convex, see docs/RELAUNCH-SPEC.md).
 * - mock mode (LLM_MODE=mock): deterministic canned answers, zero network.
 *   Brand is mentioned in ~1/3 of samples (deterministically) so local E2E
 *   produces non-trivial scores; the grounded model gets plausible citations.
 *
 * Every call records ~$0.01 via internal.spend.record. Callers check the
 * daily breaker BEFORE batches (internal.spend.check), not per call.
 *
 * This file exports plain helpers only — no Convex functions — so it never
 * widens the public API surface.
 */

import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  hashString,
  mockBrandProfile,
  brandNameFromDomain,
  type CrawlResult,
} from "./lib/pure";

export const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

/** Flat cost estimate per LLM call, for the daily circuit breaker. */
export const COST_PER_CALL_USD = 0.01;

export type ModelSpec = {
  id: string;
  grounded: boolean;
  /** Honest capability label, surfaced in the UI next to scores. */
  label: string;
};

/**
 * Model defaults in ONE place, each overridable by Convex env because
 * gateway catalog drift is expected (scripts/smoke-live-llm.mjs verifies).
 */
export function modelConfig(): {
  grounded: ModelSpec;
  ungrounded1: ModelSpec;
  ungrounded2: ModelSpec;
} {
  return {
    grounded: {
      id: process.env.MODEL_GROUNDED ?? "perplexity/sonar",
      grounded: true,
      label: "search-grounded",
    },
    ungrounded1: {
      id: process.env.MODEL_UNGROUNDED_1 ?? "openai/gpt-5.1",
      grounded: false,
      label: "model knowledge, no live browsing",
    },
    ungrounded2: {
      id: process.env.MODEL_UNGROUNDED_2 ?? "anthropic/claude-sonnet-5",
      grounded: false,
      label: "model knowledge, no live browsing",
    },
  };
}

/** Paid kit: 3 model families. */
export function paidModels(): ModelSpec[] {
  const m = modelConfig();
  return [m.grounded, m.ungrounded1, m.ungrounded2];
}

/** Free check: grounded + one ungrounded model. */
export function freeCheckModels(): ModelSpec[] {
  const m = modelConfig();
  return [m.grounded, m.ungrounded1];
}

export function isMockMode(): boolean {
  return process.env.LLM_MODE === "mock";
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

export type MockContext = {
  brandName: string;
  domain: string;
  category: string;
  competitors: string[];
  /** Deterministic seed, e.g. `${domain}|${promptId}|${run}`. */
  seed: string;
};

export type LlmResult = { text: string; citedUrls: string[] };

/**
 * One completion. Identical call sites in mock and live mode — only the
 * transport differs. Records spend for every call (mock included, so the
 * breaker is exercised in E2E).
 */
export async function llmComplete(
  ctx: ActionCtx,
  opts: {
    model: ModelSpec;
    prompt: string;
    maxTokens?: number;
    mock?: MockContext;
  }
): Promise<LlmResult> {
  await ctx.runMutation(internal.spend.record, {
    usd: COST_PER_CALL_USD,
    calls: 1,
  });
  if (isMockMode()) {
    return mockComplete(opts.model, opts.prompt, opts.mock);
  }
  return liveComplete(opts.model, opts.prompt, opts.maxTokens ?? 600);
}

async function liveComplete(
  model: ModelSpec,
  prompt: string,
  maxTokens: number
): Promise<LlmResult> {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new Error("llm_no_api_key");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 60_000);
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        // Provider-default temperature on purpose — disclosed in methodology.
      }),
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`llm_http_${res.status}`);
    const json: unknown = await res.json();
    const j = json as {
      choices?: Array<{
        message?: {
          content?: unknown;
          annotations?: Array<{ url_citation?: { url?: unknown } }>;
        };
      }>;
      citations?: unknown[];
      search_results?: Array<{ url?: unknown }>;
    };
    const text = j?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.length === 0) {
      throw new Error("llm_empty_response");
    }
    return { text, citedUrls: extractCitations(j) };
  } catch (e) {
    if (ac.signal.aborted) throw new Error("llm_timeout");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function extractCitations(j: {
  choices?: Array<{
    message?: { annotations?: Array<{ url_citation?: { url?: unknown } }> };
  }>;
  citations?: unknown[];
  search_results?: Array<{ url?: unknown }>;
}): string[] {
  const urls: string[] = [];
  if (Array.isArray(j.citations)) {
    for (const c of j.citations) if (typeof c === "string") urls.push(c);
  }
  if (Array.isArray(j.search_results)) {
    for (const r of j.search_results) {
      if (typeof r?.url === "string") urls.push(r.url);
    }
  }
  const annotations = j.choices?.[0]?.message?.annotations;
  if (Array.isArray(annotations)) {
    for (const a of annotations) {
      const u = a?.url_citation?.url;
      if (typeof u === "string") urls.push(u);
    }
  }
  return Array.from(new Set(urls)).slice(0, 20);
}

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

const MOCK_TRAITS = [
  "strong for teams that want depth over simplicity",
  "popular with smaller teams for its quick setup",
  "frequently praised for its reporting",
  "a common default choice with a large ecosystem",
  "known for flexible pricing",
];

function mockComplete(
  model: ModelSpec,
  prompt: string,
  mock?: MockContext
): LlmResult {
  const m: MockContext = mock ?? {
    brandName: "Example",
    domain: "example.com",
    category: "software tools",
    competitors: ["AcmeRank", "BrandLens", "EchoMetric"],
    seed: prompt,
  };
  const h = hashString(`${m.seed}|${model.id}|${prompt}`);
  const mention = h % 3 === 0; // ~1/3 of samples, deterministic
  const pool = m.competitors.length
    ? m.competitors
    : ["AcmeRank", "BrandLens", "EchoMetric"];
  const c1 = pool[h % pool.length];
  const c2 = pool[(h >> 4) % pool.length];
  const comps = h % 7 === 0 ? [] : c1 === c2 ? [c1] : [c1, c2];

  const openers = [
    `There are a few ${m.category} that come up consistently.`,
    `If you're evaluating ${m.category}, a handful of names stand out.`,
    `The short answer: it depends on team size and budget, but several ${m.category} are safe bets.`,
    `Here's how the current landscape of ${m.category} looks.`,
  ];
  const sentences: string[] = [openers[h % openers.length]];
  comps.forEach((c, i) =>
    sentences.push(`${c} is ${MOCK_TRAITS[(h >> (i * 3 + 2)) % MOCK_TRAITS.length]}.`)
  );
  if (mention) {
    sentences.push(
      `${m.brandName} (${m.domain}) is also worth a look if you want ${m.category} without heavy onboarding.`
    );
  }
  sentences.push(
    model.grounded
      ? "Recent write-ups and community threads broadly agree on these options."
      : "Based on what I know, those are the names most people shortlist."
  );
  return {
    text: sentences.join(" "),
    citedUrls: model.grounded ? mockCitations(h, m.domain, m.category, mention) : [],
  };
}

function mockCitations(
  h: number,
  domain: string,
  category: string,
  mention: boolean
): string[] {
  const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const urls = [
    `https://www.g2.com/categories/${slug}`,
    `https://www.reddit.com/r/smallbusiness/comments/${(h % 46656).toString(36)}/best_${slug.replace(/-/g, "_")}/`,
  ];
  if (h % 5 === 0) {
    urls.push(`https://news.ycombinator.com/item?id=${40_000_000 + (h % 999_999)}`);
  }
  if (mention) urls.push(`https://${domain}/`);
  return urls;
}

// ---------------------------------------------------------------------------
// Brand inference (shared by free check + paid pipeline)
// ---------------------------------------------------------------------------

export type BrandContext = {
  brandName: string;
  category: string;
  competitors: string[];
};

/**
 * Infer brand name / category / competitors from crawl data. Deterministic in
 * mock mode; one LLM call in live mode with a deterministic fallback.
 */
export async function inferBrandContext(
  ctx: ActionCtx,
  args: { domain: string; crawl: CrawlResult | null }
): Promise<BrandContext> {
  const { domain, crawl } = args;
  if (isMockMode()) return mockBrandProfile(domain);

  const fallback: BrandContext = {
    brandName: brandNameFromDomain(domain),
    category: "products in this company's market",
    competitors: [],
  };
  try {
    const { ungrounded1 } = modelConfig();
    const prompt = [
      `You are given metadata crawled from a company homepage. Reply with ONLY a JSON object, no markdown fences:`,
      `{"brandName": string, "category": string, "competitors": string[]}`,
      `- "category": a plural noun phrase for the product category, e.g. "email marketing platforms".`,
      `- "competitors": 3-5 well-known direct competitors (product names only).`,
      ``,
      `Domain: ${domain}`,
      `Title: ${crawl?.title ?? ""}`,
      `Meta description: ${crawl?.description ?? ""}`,
      `Headings: ${(crawl?.headings ?? []).slice(0, 10).map((h) => h.text).join(" | ")}`,
      `Excerpt: ${(crawl?.textExcerpt ?? "").slice(0, 1500)}`,
    ].join("\n");
    const { text } = await llmComplete(ctx, {
      model: ungrounded1,
      prompt,
      maxTokens: 300,
    });
    const parsed: unknown = JSON.parse(stripJsonFences(text));
    const p = parsed as {
      brandName?: unknown;
      category?: unknown;
      competitors?: unknown;
    };
    const brandName =
      typeof p.brandName === "string" && p.brandName.trim()
        ? p.brandName.trim().slice(0, 80)
        : fallback.brandName;
    const category =
      typeof p.category === "string" && p.category.trim()
        ? p.category.trim().slice(0, 80)
        : fallback.category;
    const competitors = Array.isArray(p.competitors)
      ? p.competitors
          .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
          .map((c) => c.trim().slice(0, 60))
          .filter((c) => c.toLowerCase() !== brandName.toLowerCase())
          .slice(0, 5)
      : [];
    return { brandName, category, competitors };
  } catch {
    return fallback;
  }
}

export function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COOLDOWN_BASE_MS,
  COOLDOWN_MAX_MS,
  DEFAULT_FREE_MODELS,
  MAX_CHAIN,
  ModelCallError,
  PREMIUM_MODEL,
  STRATEGIES,
  STRATEGY_LABELS,
  WORKER_MODEL,
  callModel,
  chooseChain,
  freeModels,
  isChainWorthy,
  nextCooldownMs,
  resolveUpstream,
  retryAfterMs,
  type Strategy,
} from "../convex/lib/router";
import type { Tier } from "../convex/lib/roster";

const ENV_KEYS = [
  "CLAWMART_FREE_MODELS",
  "OMNIROUTE_BASE_URL",
  "OMNIROUTE_API_KEY",
  "OPENROUTER_API_KEY",
] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
});

const TIERS: Tier[] = ["worker", "premium"];
const PAID = [WORKER_MODEL, PREMIUM_MODEL];

describe("chooseChain", () => {
  it("never bills a 'free' mission, on either tier", () => {
    for (const tier of TIERS) {
      const chain = chooseChain("free", tier);
      expect(chain.length).toBeGreaterThan(0);
      expect(chain).not.toContain(WORKER_MODEL);
      expect(chain).not.toContain(PREMIUM_MODEL);
      for (const model of chain) expect(DEFAULT_FREE_MODELS).toContain(model);
    }
    // Again with a short free list: with the 6 defaults the MAX_CHAIN slice
    // would hide a paid fallback that had been appended by mistake.
    process.env.CLAWMART_FREE_MODELS = "free/a,free/b";
    for (const tier of TIERS) {
      expect(chooseChain("free", tier)).toEqual(["free/a", "free/b"]);
    }
  });

  it("stays free even when every free model is cooled down", () => {
    const cooled = new Set([...DEFAULT_FREE_MODELS, ...PAID]);
    for (const tier of TIERS) {
      const chain = chooseChain("free", tier, cooled);
      // Empty chain == the task fails without a single request; one cooled
      // attempt is the intended degradation.
      expect(chain).toEqual([DEFAULT_FREE_MODELS[0]]);
      expect(chain).not.toContain(WORKER_MODEL);
      expect(chain).not.toContain(PREMIUM_MODEL);
    }
  });

  it("balanced tries free capacity first and keeps the tier's paid model last", () => {
    process.env.CLAWMART_FREE_MODELS = "free/a,free/b";
    expect(chooseChain("balanced", "worker")).toEqual(["free/a", "free/b", WORKER_MODEL]);
    expect(chooseChain("balanced", "premium")).toEqual(["free/a", "free/b", PREMIUM_MODEL]);
  });

  it("caps the chain at MAX_CHAIN but never lets truncation drop the paid fallback", () => {
    // The default free list is longer than MAX_CHAIN, so [...free, paid] gets
    // truncated. STRATEGY_LABELS.balanced promises a paid fallback, so the paid
    // model must survive that cut — otherwise balanced silently equals free and
    // a rate-limited mission fails with no paid attempt ever made.
    expect(DEFAULT_FREE_MODELS.length).toBeGreaterThanOrEqual(MAX_CHAIN);
    for (const tier of TIERS) {
      const paid = tier === "premium" ? PREMIUM_MODEL : WORKER_MODEL;
      const chain = chooseChain("balanced", tier);
      expect(chain.length).toBe(MAX_CHAIN);
      expect(chain[chain.length - 1]).toBe(paid);
      // Everything ahead of it is still free capacity, tried first.
      for (const model of chain.slice(0, -1)) expect(DEFAULT_FREE_MODELS).toContain(model);
    }
  });

  it("reaches healthy models below the MAX_CHAIN cut when the leaders are cooled", () => {
    // Filtering must happen before truncation. With the first three free models
    // cooled down, the 4th onward are healthy and must become reachable rather
    // than staying hidden behind a slice taken off the unfiltered list.
    const cooled = new Set(DEFAULT_FREE_MODELS.slice(0, 3));
    const chain = chooseChain("balanced", "worker", cooled);
    for (const model of chain) expect(cooled.has(model)).toBe(false);
    expect(chain).toContain(DEFAULT_FREE_MODELS[3]);
    expect(chain).toContain(WORKER_MODEL);
  });

  it("quality puts the premium model first for premium work and never uses a free model", () => {
    process.env.CLAWMART_FREE_MODELS = "free/a,free/b";
    expect(chooseChain("quality", "premium")).toEqual([PREMIUM_MODEL, WORKER_MODEL]);
    expect(chooseChain("quality", "worker")).toEqual([WORKER_MODEL, PREMIUM_MODEL]);
    for (const tier of TIERS) {
      for (const model of chooseChain("quality", tier)) {
        expect(model.endsWith(":free")).toBe(false);
        expect(["free/a", "free/b"]).not.toContain(model);
      }
    }
  });

  it("filters cooled models while preserving preference order", () => {
    process.env.CLAWMART_FREE_MODELS = "free/a,free/b,free/c";
    expect(chooseChain("balanced", "worker", new Set(["free/b"]))).toEqual([
      "free/a",
      "free/c",
      WORKER_MODEL,
    ]);
    expect(chooseChain("quality", "premium", new Set([PREMIUM_MODEL]))).toEqual([WORKER_MODEL]);
  });

  it("returns exactly the top choice when everything is cooled", () => {
    process.env.CLAWMART_FREE_MODELS = "free/a,free/b";
    const cooled = new Set(["free/a", "free/b", WORKER_MODEL, PREMIUM_MODEL]);
    expect(chooseChain("balanced", "worker", cooled)).toEqual(["free/a"]);
    expect(chooseChain("quality", "premium", cooled)).toEqual([PREMIUM_MODEL]);
  });

  it("de-duplicates when the free list repeats or names the paid model", () => {
    process.env.CLAWMART_FREE_MODELS = `free/a, free/a ,${WORKER_MODEL}`;
    expect(chooseChain("balanced", "worker")).toEqual(["free/a", WORKER_MODEL]);
  });

  it("always returns a bounded, duplicate-free chain across every combination", () => {
    process.env.CLAWMART_FREE_MODELS = "free/a,free/b,free/c,free/d,free/e";
    const cooledSets = [
      new Set<string>(),
      new Set(["free/a"]),
      new Set(["free/a", "free/b", "free/c"]),
      new Set(["free/a", "free/b", "free/c", "free/d", "free/e", WORKER_MODEL, PREMIUM_MODEL]),
    ];
    for (const strategy of STRATEGIES) {
      for (const tier of TIERS) {
        for (const cooled of cooledSets) {
          const chain = chooseChain(strategy, tier, cooled);
          expect(chain.length).toBeGreaterThanOrEqual(1);
          expect(chain.length).toBeLessThanOrEqual(MAX_CHAIN);
          expect(new Set(chain).size).toBe(chain.length);
        }
      }
    }
  });

  it("treats an unrecognized strategy as balanced", () => {
    process.env.CLAWMART_FREE_MODELS = "free/a";
    expect(chooseChain("nonsense" as Strategy, "worker")).toEqual(
      chooseChain("balanced", "worker")
    );
  });

  it("labels every strategy", () => {
    for (const strategy of STRATEGIES) {
      expect(STRATEGY_LABELS[strategy]?.trim().length).toBeGreaterThan(0);
    }
    expect(Object.keys(STRATEGY_LABELS).length).toBe(STRATEGIES.length);
  });
});

describe("nextCooldownMs", () => {
  it("does not cool down a model that has not failed", () => {
    expect(nextCooldownMs(0)).toBe(0);
    expect(nextCooldownMs(-3)).toBe(0);
  });

  it("doubles per consecutive failure", () => {
    expect(nextCooldownMs(1)).toBe(COOLDOWN_BASE_MS);
    expect(nextCooldownMs(2)).toBe(2 * COOLDOWN_BASE_MS);
    expect(nextCooldownMs(3)).toBe(4 * COOLDOWN_BASE_MS);
    expect(nextCooldownMs(5)).toBe(16 * COOLDOWN_BASE_MS);
  });

  it("caps at COOLDOWN_MAX_MS and never regresses", () => {
    expect(nextCooldownMs(6)).toBe(COOLDOWN_MAX_MS);
    expect(nextCooldownMs(50)).toBe(COOLDOWN_MAX_MS);
    expect(nextCooldownMs(1e6)).toBe(COOLDOWN_MAX_MS);
    let previous = 0;
    for (let failures = 0; failures <= 25; failures++) {
      const ms = nextCooldownMs(failures);
      expect(ms).toBeGreaterThanOrEqual(previous);
      expect(ms).toBeLessThanOrEqual(COOLDOWN_MAX_MS);
      expect(Number.isFinite(ms)).toBe(true);
      previous = ms;
    }
  });
});

describe("retryAfterMs", () => {
  const now = Date.parse("Wed, 21 Oct 2015 07:28:00 GMT");

  it("reads delay-seconds", () => {
    expect(retryAfterMs("120", now)).toBe(120_000);
    expect(retryAfterMs("  30  ", now)).toBe(30_000);
    expect(retryAfterMs("0", now)).toBe(0);
  });

  it("reads an HTTP date relative to now", () => {
    expect(retryAfterMs("Wed, 21 Oct 2015 07:30:00 GMT", now)).toBe(120_000);
    // A date already in the past must not produce a negative cooldown.
    expect(retryAfterMs("Wed, 21 Oct 2015 07:00:00 GMT", now)).toBe(0);
    expect(retryAfterMs("-5", now)).toBe(0);
  });

  it("clamps to COOLDOWN_MAX_MS", () => {
    expect(retryAfterMs("999999", now)).toBe(COOLDOWN_MAX_MS);
    expect(retryAfterMs("Fri, 21 Oct 2050 07:28:00 GMT", now)).toBe(COOLDOWN_MAX_MS);
  });

  it("returns undefined for a missing or unparseable header", () => {
    expect(retryAfterMs(null, now)).toBeUndefined();
    expect(retryAfterMs("", now)).toBeUndefined();
    expect(retryAfterMs("   ", now)).toBeUndefined();
    expect(retryAfterMs("soon", now)).toBeUndefined();
    expect(retryAfterMs("1e400", now)).toBeUndefined(); // Infinity, not a delay
  });
});

describe("isChainWorthy", () => {
  it("stops the chain on our own auth and billing failures", () => {
    for (const status of [401, 402, 403]) expect(isChainWorthy(status)).toBe(false);
  });

  it("advances the chain on upstream and transport failures", () => {
    for (const status of [408, 429, 500, 502, 503, 404]) {
      expect(isChainWorthy(status)).toBe(true);
    }
    expect(isChainWorthy(undefined)).toBe(true);
  });
});

describe("freeModels", () => {
  it("falls back to the defaults when unset, empty, or all separators", () => {
    delete process.env.CLAWMART_FREE_MODELS;
    expect(freeModels()).toEqual([...DEFAULT_FREE_MODELS]);
    process.env.CLAWMART_FREE_MODELS = "";
    expect(freeModels()).toEqual([...DEFAULT_FREE_MODELS]);
    process.env.CLAWMART_FREE_MODELS = " , ,, ";
    expect(freeModels()).toEqual([...DEFAULT_FREE_MODELS]);
  });

  it("parses and trims an override", () => {
    process.env.CLAWMART_FREE_MODELS = " vendor/a:free , vendor/b:free ,,";
    expect(freeModels()).toEqual(["vendor/a:free", "vendor/b:free"]);
  });

  it("hands back a copy, not the shared default array", () => {
    delete process.env.CLAWMART_FREE_MODELS;
    const mutated = freeModels();
    mutated.push("junk/model");
    expect(freeModels()).toEqual([...DEFAULT_FREE_MODELS]);
    expect(DEFAULT_FREE_MODELS).not.toContain("junk/model");
  });
});

describe("resolveUpstream", () => {
  it("defaults to OpenRouter", () => {
    delete process.env.OMNIROUTE_BASE_URL;
    const upstream = resolveUpstream();
    expect(upstream.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(upstream.headers["x-title"]).toBe("Clawmart Agency");
  });

  it("uses a self-hosted OmniRoute gateway when configured, normalizing the base", () => {
    process.env.OMNIROUTE_BASE_URL = "  https://gw.internal/v1//  ";
    const upstream = resolveUpstream();
    expect(upstream.url).toBe("https://gw.internal/v1/chat/completions");
    expect(upstream.headers["x-omniroute-combo"]).toBe("auto/cheap");
  });
});

describe("callModel", () => {
  const messages = [{ role: "user" as const, content: "hi" }];

  const stubFetch = (impl: () => Promise<Response>) => {
    const fn = vi.fn(impl);
    vi.stubGlobal("fetch", fn);
    return fn;
  };

  it("fails fast with a chain-stopping status when no key is configured", async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OMNIROUTE_API_KEY;
    delete process.env.OMNIROUTE_BASE_URL;
    const fetchMock = stubFetch(async () => new Response("{}"));
    await expect(callModel("vendor/a:free", messages, 100)).rejects.toMatchObject({
      name: "ModelCallError",
      status: 401,
    });
    expect(isChainWorthy(401)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the completion and token usage", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.OMNIROUTE_BASE_URL;
    stubFetch(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "the work" } }],
            usage: { prompt_tokens: 11, completion_tokens: 22 },
          })
        )
    );
    await expect(callModel("vendor/a:free", messages, 100)).resolves.toEqual({
      text: "the work",
      model: "vendor/a:free",
      tokensIn: 11,
      tokensOut: 22,
    });
  });

  it("carries the 429 Retry-After through as a cooldown hint", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.OMNIROUTE_BASE_URL;
    stubFetch(
      async () => new Response("rate limited", { status: 429, headers: { "retry-after": "42" } })
    );
    const err = await callModel("vendor/a:free", messages, 100).catch((e) => e);
    expect(err).toBeInstanceOf(ModelCallError);
    expect(err.status).toBe(429);
    expect(err.cooldownHintMs).toBe(42_000);
  });

  it("treats a 200 with an empty choice as a failure, with no status so the chain advances", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.OMNIROUTE_BASE_URL;
    stubFetch(async () => new Response(JSON.stringify({ error: { message: "upstream is busy" } })));
    const err = await callModel("vendor/a:free", messages, 100).catch((e) => e);
    expect(err).toBeInstanceOf(ModelCallError);
    expect(err.status).toBeUndefined();
    expect(err.message).toContain("empty completion");
    expect(isChainWorthy(err.status)).toBe(true);
  });

  it("wraps a transport failure without a status", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.OMNIROUTE_BASE_URL;
    stubFetch(async () => {
      throw new Error("socket hang up");
    });
    const err = await callModel("vendor/a:free", messages, 100).catch((e) => e);
    expect(err).toBeInstanceOf(ModelCallError);
    expect(err.status).toBeUndefined();
    expect(err.message).toContain("socket hang up");
  });
});

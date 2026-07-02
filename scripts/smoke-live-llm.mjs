#!/usr/bin/env node
/**
 * smoke-live-llm.mjs — 5-minute sanity check of the live LLM path.
 *
 * Runs 2 tiny prompts against the 3 contract models via the Vercel AI
 * Gateway, printing model id + ok/fail + the first 60 chars of each answer.
 * Exits non-zero if any call fails (e.g. a model id has drifted out of the
 * gateway catalog — see MODEL_* overrides below).
 *
 * Usage:
 *   AI_GATEWAY_API_KEY=... node scripts/smoke-live-llm.mjs
 *
 * The key is read from the environment and NEVER printed.
 * Model overrides (mirror the Convex env vars):
 *   MODEL_GROUNDED, MODEL_UNGROUNDED_1, MODEL_UNGROUNDED_2
 */

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error(
    "AI_GATEWAY_API_KEY is not set. Create one in the Vercel dashboard (AI Gateway) and run:\n" +
      "  AI_GATEWAY_API_KEY=<key> node scripts/smoke-live-llm.mjs"
  );
  process.exit(1);
}

const MODELS = [
  { id: process.env.MODEL_GROUNDED || "perplexity/sonar", grounded: true },
  { id: process.env.MODEL_UNGROUNDED_1 || "openai/gpt-5.1", grounded: false },
  {
    id: process.env.MODEL_UNGROUNDED_2 || "anthropic/claude-sonnet-5",
    grounded: false,
  },
];

const PROMPTS = [
  "Reply with exactly the word: ok",
  "What is 2 + 2? Reply with just the number.",
];

async function callModel(model, prompt) {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 64,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    // Response bodies never contain the key; safe to excerpt.
    const body = (await res.text()).slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("empty completion");
  }
  return text;
}

let failures = 0;

for (const { id, grounded } of MODELS) {
  for (const prompt of PROMPTS) {
    try {
      const text = await callModel(id, prompt);
      const preview = text.replace(/\s+/g, " ").slice(0, 60);
      console.log(`ok    ${id} (grounded: ${grounded}) — "${preview}"`);
    } catch (err) {
      failures += 1;
      console.error(`FAIL  ${id} (grounded: ${grounded}) — ${err.message}`);
    }
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} call(s) failed. If a model id is gone from the gateway ` +
      "catalog, pick a replacement and set MODEL_GROUNDED / MODEL_UNGROUNDED_1 / " +
      "MODEL_UNGROUNDED_2 in the Convex env (npx convex env set ... --prod)."
  );
  process.exit(1);
}

console.log("\nAll models responded. Live LLM path looks healthy.");

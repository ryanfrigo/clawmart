/**
 * Company Studio engine — one Convex action per pipeline step.
 *
 * runStep is scheduled by companies.beginBuild (step 0) and then by
 * companies.completeStep for each subsequent step, so a build is a chain of
 * short-lived actions with no single-function timeout ceiling (see
 * docs/COMPANY-STUDIO.md — the "no EC2" decision).
 *
 * LLM calls go straight to OpenRouter (never Vercel AI Gateway).
 * OPENROUTER_API_KEY lives in Convex env only.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { PIPELINE, AGENTS, extractJson, type ChatMessage } from "./lib/agents";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_ATTEMPTS = 2;

interface OpenRouterResult {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
}

async function callOpenRouter(
  model: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<OpenRouterResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

  // Bound a hung upstream call well below the action ceiling so the step can
  // retry/fail cleanly. Feature-detected: fall back to no signal if the
  // runtime lacks AbortSignal.timeout.
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(120_000)
      : undefined;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal,
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      // OpenRouter attribution headers (optional but recommended)
      "http-referer": "https://clawmart.co",
      "x-title": "Clawmart Studio",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`openrouter ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("openrouter returned an empty completion");
  return {
    text,
    tokensIn: data.usage?.prompt_tokens,
    tokensOut: data.usage?.completion_tokens,
  };
}

export const runStep = internalAction({
  args: { companyId: v.id("companies"), stepIndex: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const key = PIPELINE[args.stepIndex];
    if (!key) return null;
    const agent = AGENTS[key];

    const context = await ctx.runQuery(internal.companies.getStepContext, {
      companyId: args.companyId,
      stepIndex: args.stepIndex,
    });
    // Missing/duplicate schedule or an already-settled run: no-op.
    if (!context || context.run.status !== "queued") return null;

    const messages = agent.buildMessages(context.idea, context.assets);
    let lastError = "unknown error";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await ctx.runMutation(internal.companies.markRunning, {
        companyId: args.companyId,
        runId: context.run._id,
        agentKey: key,
        attempt,
        title: agent.title,
        model: agent.model,
      });
      try {
        const result = await callOpenRouter(
          agent.model,
          attempt === 1
            ? messages
            : [
                ...messages,
                {
                  role: "user" as const,
                  content:
                    "Your previous reply was not a single valid JSON object. Return ONLY the JSON object now.",
                },
              ],
          agent.maxTokens
        );
        const parsed = extractJson(result.text);
        const outputJson = JSON.stringify(parsed);
        const preview = `${agent.title} finished — ${summarize(key, parsed)}`;
        await ctx.runMutation(internal.companies.completeStep, {
          companyId: args.companyId,
          runId: context.run._id,
          stepIndex: args.stepIndex,
          outputJson,
          preview,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        });
        return null;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    await ctx.runMutation(internal.companies.failStep, {
      companyId: args.companyId,
      runId: context.run._id,
      agentKey: key,
      error: lastError,
    });
    return null;
  },
});

/** One human line per finished step for the live feed. */
function summarize(key: string, output: Record<string, unknown>): string {
  switch (key) {
    case "strategist":
      return typeof output.positioning === "string"
        ? output.positioning.slice(0, 160)
        : "business plan drafted.";
    case "brand":
      return typeof output.name === "string"
        ? `meet “${output.name}” — ${typeof output.tagline === "string" ? output.tagline : "brand defined."}`
        : "brand defined.";
    case "product":
      return Array.isArray(output.coreFeatures)
        ? `${output.coreFeatures.length} core features specced.`
        : "product specced.";
    case "landing":
      return "landing page written.";
    case "marketing":
      return Array.isArray(output.tweets)
        ? `launch kit ready (${output.tweets.length} tweets, LinkedIn post, cold email).`
        : "launch kit ready.";
    default:
      return "done.";
  }
}

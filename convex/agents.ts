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

import { v, ConvexError } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  PIPELINE,
  AGENTS,
  WORKER_MODEL,
  FALLBACK_IDEAS,
  surpriseIdeaMessages,
  extractJson,
  type ChatMessage,
} from "./lib/agents";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_ATTEMPTS = 2;

interface OpenRouterResult {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
}

// Shared by the pipeline, surpriseIdea, and the daily check-ins (checkins.ts).
export async function callOpenRouter(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  timeoutMs = 120_000
): Promise<OpenRouterResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

  // Bound a hung upstream call well below the action ceiling so the step can
  // retry/fail cleanly. Interactive callers pass a much shorter budget.
  // Feature-detected: fall back to no signal if the runtime lacks
  // AbortSignal.timeout.
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
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

/**
 * "Surprise me" — one model-invented idea for the create form. Auth'd and
 * rate-limited (companies.bumpSurpriseLimit); falls back to a curated pool if
 * the model call fails, so the button always produces something.
 */
export const surpriseIdea = action({
  args: {},
  handler: async (ctx): Promise<{ idea: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("unauthenticated");
    await ctx.runMutation(internal.companies.bumpSurpriseLimit, {
      userId: identity.subject,
    });
    try {
      // 15s budget: this is a button click, not a pipeline step — a slow
      // upstream should degrade to the offline pool, not a 2-minute spinner.
      const result = await callOpenRouter(
        WORKER_MODEL,
        surpriseIdeaMessages(),
        300,
        15_000
      );
      const parsed = extractJson(result.text);
      const idea = typeof parsed.idea === "string" ? parsed.idea.trim() : "";
      if (idea.length >= 20 && idea.length <= 500) return { idea };
      console.log("surprise_model_unusable_output");
    } catch (err) {
      // Visible in Convex logs — a dead key/model must not degrade silently
      // to the canned pool forever.
      console.log(
        `surprise_model_failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`
      );
    }
    return {
      idea: FALLBACK_IDEAS[Math.floor(Math.random() * FALLBACK_IDEAS.length)],
    };
  },
});

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

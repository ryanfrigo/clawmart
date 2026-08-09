/**
 * Clawmart Agency — mission engine (the action layer).
 *
 * Four actions, chained through the Convex scheduler so a mission is durable
 * and has no single-function timeout ceiling (the same "no EC2" reasoning as
 * docs/COMPANY-STUDIO.md):
 *
 *   planMission   — the orchestrator staffs the roster and writes the task DAG
 *   tick          — claims whatever is now ready and fans out runTask
 *   runTask       — one specialist does one task, then ticks the mission again
 *   distillMemory — after a settled mission, writes what the team learned into
 *                   company memory so the NEXT mission does not start cold
 *
 * Parallelism falls out of that loop: a settling task ticks the mission, which
 * claims every task its completion unblocked, up to MAX_CONCURRENT_TASKS. This
 * is the prime-agent "spawn subagents and let them run" shape, expressed with
 * the scheduler instead of a process supervisor.
 *
 * Every model call goes through lib/router.ts, which prefers free capacity and
 * walks a fallback chain. All state transitions live in missions.ts.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { extractJson } from "./lib/agents";
import {
  buildTaskMessages,
  getAgent,
  memoryMessages,
  normalizeTaskOutput,
  planMessages,
  validateLearnings,
  validatePlan,
  type ChatMessage,
} from "./lib/roster";
import {
  ModelCallError,
  callModel,
  chooseChain,
  isChainWorthy,
  type Strategy,
} from "./lib/router";

/** Output ceiling per task — bounds cost and keeps free endpoints in budget. */
const TASK_MAX_TOKENS = 3000;
const PLAN_MAX_TOKENS = 2000;
/** Distilling is a summarizer, not a planner: a handful of sentences. */
const MEMORY_MAX_TOKENS = 700;

/** Appended after a model returns unparseable output, before the next attempt. */
const JSON_NUDGE: ChatMessage = {
  role: "user",
  content:
    "Your previous reply was not a single valid JSON object. Return ONLY the JSON object now, with no prose and no code fences.",
};

/** Record a failed model call and report whether the chain should continue. */
async function recordFailure(
  ctx: ActionCtx,
  model: string,
  err: unknown
): Promise<{ keepGoing: boolean; message: string }> {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof ModelCallError) {
    await ctx.runMutation(internal.missions.reportModelResult, {
      model,
      ok: false,
      cooldownMs: err.cooldownHintMs,
      error: message,
    });
    return { keepGoing: isChainWorthy(err.status), message };
  }
  // The model answered but the output was unusable (bad JSON, empty envelope).
  // That is a quality problem, not an availability one — do not cool the model
  // down for it, just move on to the next one in the chain.
  return { keepGoing: true, message };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export const planMission = internalAction({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(internal.missions.planContext, {
      missionId: args.missionId,
    });
    // Missing mission, duplicate schedule, or a cancel that beat us here.
    if (!context || context.status !== "planning") return null;

    const messages = planMessages(context.goal, context.company, context.memory);
    const cooled = new Set(await ctx.runQuery(internal.missions.cooledDownModels, {}));
    // Planning is the highest-leverage call of the whole mission — a bad DAG
    // wastes every downstream task — so it always asks for the premium tier of
    // whatever strategy the user picked.
    const chain = chooseChain(context.strategy as Strategy, "premium", cooled);

    let lastError = "the orchestrator produced no usable plan";
    let nudged = false;

    for (const model of chain) {
      try {
        const result = await callModel(
          model,
          nudged ? [...messages, JSON_NUDGE] : messages,
          PLAN_MAX_TOKENS
        );
        await ctx.runMutation(internal.missions.reportModelResult, { model, ok: true });

        const plan = validatePlan(extractJson(result.text));
        await ctx.runMutation(internal.missions.savePlan, {
          missionId: args.missionId,
          approach: plan.approach,
          tasks: plan.tasks,
        });
        await ctx.scheduler.runAfter(0, internal.missionEngine.tick, {
          missionId: args.missionId,
        });
        return null;
      } catch (err) {
        const outcome = await recordFailure(ctx, model, err);
        lastError = outcome.message;
        if (!(err instanceof ModelCallError)) nudged = true;
        if (!outcome.keepGoing) break;
      }
    }

    await ctx.runMutation(internal.missions.failMission, {
      missionId: args.missionId,
      error: lastError,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Tick — the wave scheduler
// ---------------------------------------------------------------------------

export const tick = internalAction({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args): Promise<null> => {
    // claimReadyTasks is transactional: it marks the claimed tasks running and
    // settles the mission when nothing is left, so concurrent ticks cannot
    // double-run a task or double-finalize a mission.
    const { claimed } = await ctx.runMutation(internal.missions.claimReadyTasks, {
      missionId: args.missionId,
    });
    for (const task of claimed) {
      await ctx.scheduler.runAfter(0, internal.missionEngine.runTask, { taskId: task.taskId });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Run one specialist
// ---------------------------------------------------------------------------

export const runTask = internalAction({
  args: { taskId: v.id("missionTasks") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(internal.missions.taskContext, { taskId: args.taskId });
    // Task already settled, mission cancelled, or a duplicate schedule.
    if (!context) return null;

    const settle = async (error: string) => {
      await ctx.runMutation(internal.missions.failTask, { taskId: args.taskId, error });
      // Tick regardless: a failed task unblocks the skip-cascade and may be the
      // last thing standing between the mission and being settled.
      await ctx.scheduler.runAfter(0, internal.missionEngine.tick, {
        missionId: context.missionId,
      });
    };

    const agent = getAgent(context.agentKey);
    if (!agent) {
      // validatePlan should make this impossible; fail loudly rather than hang.
      await settle(`no roster agent named "${context.agentKey}"`);
      return null;
    }

    const messages = buildTaskMessages(agent, {
      goal: context.goal,
      company: context.company,
      brief: context.brief,
      upstream: context.upstream,
      memory: context.memory,
    });

    const cooled = new Set(await ctx.runQuery(internal.missions.cooledDownModels, {}));
    const chain = chooseChain(context.strategy as Strategy, agent.tier, cooled);

    let lastError = "no model produced usable output";
    let nudged = false;

    for (const model of chain) {
      try {
        const result = await callModel(
          model,
          nudged ? [...messages, JSON_NUDGE] : messages,
          TASK_MAX_TOKENS
        );
        await ctx.runMutation(internal.missions.reportModelResult, { model, ok: true });

        const output = normalizeTaskOutput(extractJson(result.text));
        await ctx.runMutation(internal.missions.completeTask, {
          taskId: args.taskId,
          outputJson: JSON.stringify(output),
          summary: output.summary,
          handoff: output.handoff,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        });
        await ctx.scheduler.runAfter(0, internal.missionEngine.tick, {
          missionId: context.missionId,
        });
        return null;
      } catch (err) {
        const outcome = await recordFailure(ctx, model, err);
        lastError = outcome.message;
        if (!(err instanceof ModelCallError)) nudged = true;
        if (!outcome.keepGoing) break;
      }
    }

    await settle(lastError);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Distill the mission into company memory
// ---------------------------------------------------------------------------

/**
 * One model call that turns a finished mission into durable company memory.
 *
 * Scheduled by missions.claimReadyTasks at the moment the mission settles
 * `done`. Entirely best-effort: the mission is ALREADY settled before this runs
 * and nothing here writes to it, so a dead chain, a rate-limited endpoint, or
 * garbage JSON simply means this company learns nothing from this mission. A
 * missed learning is cheap; reopening a completed mission is not.
 */
export const distillMemory = internalAction({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args): Promise<null> => {
    const outcome = await ctx.runQuery(internal.missions.missionOutcome, {
      missionId: args.missionId,
    });
    // Not settled done, or nobody left a handoff worth learning from.
    if (!outcome) return null;

    const messages = memoryMessages({
      goal: outcome.goal,
      company: outcome.company,
      deliverables: outcome.deliverables,
    });

    const cooled = new Set(await ctx.runQuery(internal.missions.cooledDownModels, {}));
    // Worker tier: summarizing handoffs the specialists already wrote is the
    // cheapest work in the mission, and it must never outspend the mission.
    const chain = chooseChain(outcome.strategy as Strategy, "worker", cooled);

    let nudged = false;

    for (const model of chain) {
      try {
        const result = await callModel(
          model,
          nudged ? [...messages, JSON_NUDGE] : messages,
          MEMORY_MAX_TOKENS
        );
        await ctx.runMutation(internal.missions.reportModelResult, { model, ok: true });

        const learnings = validateLearnings(extractJson(result.text));
        await ctx.runMutation(internal.missions.rememberLearnings, {
          missionId: args.missionId,
          learnings,
        });
        return null;
      } catch (err) {
        const outcomeOfCall = await recordFailure(ctx, model, err);
        if (!(err instanceof ModelCallError)) nudged = true;
        if (!outcomeOfCall.keepGoing) break;
      }
    }

    // Chain exhausted. Nothing to report and nothing to fail — the mission's
    // deliverables are already saved and its status is final.
    return null;
  },
});

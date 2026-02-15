import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    const workforces = await ctx.db
      .query("workforces")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    // Attach agent counts
    const result = await Promise.all(
      workforces.map(async (w) => {
        const agents = await ctx.db
          .query("agents")
          .withIndex("by_workforce", (q) => q.eq("workforceId", w._id))
          .collect();
        return { ...w, agentCount: agents.length, agents };
      })
    );
    return result;
  },
});

export const get = query({
  args: { id: v.id("workforces") },
  handler: async (ctx, args) => {
    const workforce = await ctx.db.get(args.id);
    if (!workforce) return null;
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_workforce", (q) => q.eq("workforceId", args.id))
      .collect();
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_workforce", (q) => q.eq("workforceId", args.id))
      .order("desc")
      .take(20);
    return { ...workforce, agents, recentMessages };
  },
});

export const create = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    templateId: v.optional(v.id("templates")),
    config: v.optional(
      v.object({
        companyName: v.optional(v.string()),
        brandVoice: v.optional(v.string()),
        industry: v.optional(v.string()),
        context: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    // Check plan limits
    const existing = await ctx.db
      .query("workforces")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const limits: Record<string, number> = { free: 1, pro: 3, enterprise: 999 };
    if (existing.length >= limits[user.plan]) {
      throw new Error(`Plan limit reached. Upgrade to create more workforces.`);
    }

    const workforceId = await ctx.db.insert("workforces", {
      name: args.name,
      userId: user._id,
      templateId: args.templateId,
      status: "active",
      config: args.config,
      createdAt: Date.now(),
    });

    // If template selected, create agents from template
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (template) {
        for (const agent of template.agents) {
          await ctx.db.insert("agents", {
            workforceId,
            name: agent.name,
            role: agent.role,
            description: agent.description,
            systemPrompt: agent.systemPrompt,
            tools: agent.tools,
            status: "idle",
            messagesProcessed: 0,
            createdAt: Date.now(),
          });
        }
      }
    }

    return workforceId;
  },
});

export const remove = mutation({
  args: { id: v.id("workforces") },
  handler: async (ctx, args) => {
    // Delete agents
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_workforce", (q) => q.eq("workforceId", args.id))
      .collect();
    for (const agent of agents) {
      // Delete agent messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
        .collect();
      for (const msg of messages) await ctx.db.delete(msg._id);
      await ctx.db.delete(agent._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("workforces"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("setup")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

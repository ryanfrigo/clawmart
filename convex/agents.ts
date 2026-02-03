// convex/agents.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Register a new agent
export const register = mutation({
  args: {
    address: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if agent already exists
    const existing = await ctx.db.query("agents")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();
    
    if (existing) {
      throw new Error("Agent already registered");
    }
    
    const agentId = await ctx.db.insert("agents", {
      address: args.address,
      name: args.name || `Agent ${args.address.slice(0, 8)}`,
      bio: args.bio || "",
      reputation: 0,
      skillsListed: [],
      totalEarned: 0,
      totalSpent: 0,
      createdAt: Date.now(),
    });
    
    // Log activity
    await ctx.db.insert("activity", {
      type: "agent_registered",
      actor: args.address,
      metadata: { name: args.name },
      timestamp: Date.now(),
    });
    
    return { id: agentId, address: args.address };
  },
});

// Get agent by address
export const get = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query("agents")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();
    
    if (!agent) return null;
    
    // Get their skills
    const skills = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("author"), args.address))
      .collect();
    
    return { ...agent, skills };
  },
});

// List all agents
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents")
      .order("desc")
      .take(args.limit || 50);
    
    return agents;
  },
});

// Update agent profile
export const update = mutation({
  args: {
    address: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query("agents")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();
    
    if (!agent) {
      throw new Error("Agent not found");
    }
    
    await ctx.db.patch(agent._id, {
      name: args.name || agent.name,
      bio: args.bio !== undefined ? args.bio : agent.bio,
    });
    
    return { success: true };
  },
});

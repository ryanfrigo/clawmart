// convex/agentsNode.ts - Node.js runtime functions
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

// Generate API key for agent - uses Node runtime
export const generateApiKey = action({
  args: { address: v.string() },
  returns: v.object({ apiKey: v.string() }),
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(async (ctx) => {
      return await ctx.db.query("agents")
        .withIndex("by_address", q => q.eq("address", args.address))
        .first();
    });
    
    if (!agent) {
      throw new Error("Agent not found");
    }
    
    const apiKey = `cm_${crypto.randomBytes(32).toString('hex')}`;
    
    await ctx.runMutation(async (ctx) => {
      await ctx.db.patch(agent._id, {
        apiKey,
        apiKeyCreatedAt: Date.now(),
      });
    });
    
    return { apiKey };
  },
});

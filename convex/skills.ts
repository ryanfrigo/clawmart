// convex/skills.ts - Updated for user-created skills
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List skills with filters
export const list = query({
  args: {
    tag: v.optional(v.string()),
    author: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    minLevel: v.optional(v.number()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let skills = await ctx.db.query("skills").collect();
    
    if (args.tag) skills = skills.filter(s => s.tags.includes(args.tag));
    if (args.author) skills = skills.filter(s => s.author === args.author);
    if (args.verified !== undefined) skills = skills.filter(s => s.verified === args.verified);
    if (args.minLevel) skills = skills.filter(s => s.level >= args.minLevel);
    if (args.search) {
      const q = args.search.toLowerCase();
      skills = skills.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    
    skills.sort((a, b) => (b.level - a.level) || (b.rating - a.rating));
    
    return {
      skills: skills.slice(0, args.limit || 20),
      total: skills.length,
    };
  },
});

// Get single skill
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const skill = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!skill) return null;
    
    const reviews = await ctx.db.query("reviews")
      .withIndex("by_skill", q => q.eq("skillId", args.id))
      .collect();
    
    const avgRating = reviews.length 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    return {
      ...skill,
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  },
});

// CREATE SKILL - This is what users do to add their skill
export const create = mutation({
  args: {
    id: v.string(), // name@version
    name: v.string(),
    version: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    tools: v.array(v.string()),
    runtime: v.string(),
    source: v.string(), // URL to skill endpoint
    price: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get author from auth context (simplified - would verify signature)
    const author = args.id.split('@')[0]; // Simplified
    
    // Check if skill ID already exists
    const existing = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (existing) {
      throw new Error("Skill with this ID already exists");
    }
    
    // Calculate initial level based on completeness
    let level = 1;
    if (args.description.length > 100) level += 1;
    if (args.tools.length >= 2) level += 1;
    if (args.tags.length >= 3) level += 1;
    
    const skillId = await ctx.db.insert("skills", {
      ...args,
      author: `@${author}`,
      sourceOrigin: "clawmart",
      verified: false,
      rating: 0,
      usage: 0,
      level,
      xp: level * 100,
      lastUpdated: new Date().toISOString(),
      scrapedAt: Date.now(),
    });
    
    // Update agent's skillsListed
    const agent = await ctx.db.query("agents")
      .filter(q => q.eq(q.field("address"), author))
      .first();
    
    if (agent) {
      await ctx.db.patch(agent._id, {
        skillsListed: [...agent.skillsListed, args.id],
      });
    }
    
    // Log activity
    await ctx.db.insert("activity", {
      type: "skill_created",
      actor: author,
      skillId: args.id,
      timestamp: Date.now(),
    });
    
    return { id: skillId, skillId: args.id };
  },
});

// Update skill
export const update = mutation({
  args: {
    id: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    tools: v.optional(v.array(v.string())),
    price: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!skill) throw new Error("Skill not found");
    
    const updates: any = {
      lastUpdated: new Date().toISOString(),
    };
    
    if (args.description) updates.description = args.description;
    if (args.tags) updates.tags = args.tags;
    if (args.tools) updates.tools = args.tools;
    if (args.price) updates.price = args.price;
    if (args.priceAmount !== undefined) updates.priceAmount = args.priceAmount;
    if (args.source) updates.source = args.source;
    
    await ctx.db.patch(skill._id, updates);
    
    return { success: true };
  },
});

// Search skills
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const skills = await ctx.db.query("skills").collect();
    const q = args.query.toLowerCase();
    
    return skills.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  },
});

// Get leaderboard
export const leaderboard = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const skills = await ctx.db.query("skills").collect();
    
    switch (args.type) {
      case 'top_rated':
        return skills
          .filter(s => s.usage > 0)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 10);
      
      case 'most_used':
        return skills
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 10);
      
      case 'newest':
        return skills
          .sort((a, b) => b.scrapedAt - a.scrapedAt)
          .slice(0, 10);
      
      default:
        return skills.slice(0, 10);
    }
  },
});

// Delete skill
export const deleteSkill = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const skill = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!skill) throw new Error("Skill not found");
    
    await ctx.db.delete(skill._id);
    return { success: true };
  },
});

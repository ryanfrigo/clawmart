// convex/skills.ts - Convex functions for skills
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all skills with optional filtering
export const list = query({
  args: {
    tag: v.optional(v.string()),
    author: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    minLevel: v.optional(v.number()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let skills = await ctx.db.query("skills").collect();
    
    // Apply filters
    if (args.tag) {
      skills = skills.filter(s => s.tags.includes(args.tag));
    }
    if (args.author) {
      skills = skills.filter(s => s.author === args.author);
    }
    if (args.verified !== undefined) {
      skills = skills.filter(s => s.verified === args.verified);
    }
    if (args.minLevel) {
      skills = skills.filter(s => s.level >= args.minLevel);
    }
    if (args.search) {
      const query = args.search.toLowerCase();
      skills = skills.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Sort by level desc, then rating desc
    skills.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.rating - a.rating;
    });
    
    const limit = args.limit || 20;
    const paginated = skills.slice(0, limit);
    
    return {
      skills: paginated,
      total: skills.length,
    };
  },
});

// Get single skill by ID
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const skill = await ctx.db.query("skills")
      .withIndex("by_name", q => q.eq("name", args.id.split('@')[0]))
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!skill) return null;
    
    // Get reviews
    const reviews = await ctx.db.query("reviews")
      .withIndex("by_skill", q => q.eq("skillId", args.id))
      .collect();
    
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    return {
      ...skill,
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  },
});

// Insert or update a skill (called by scraper)
export const upsert = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    version: v.string(),
    author: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    tools: v.array(v.string()),
    runtime: v.string(),
    source: v.string(),
    sourceOrigin: v.string(),
    verified: v.boolean(),
    rating: v.number(),
    usage: v.number(),
    level: v.number(),
    xp: v.number(),
    price: v.optional(v.string()),
    lastUpdated: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        scrapedAt: Date.now(),
      });
      return { updated: true, id: existing._id };
    } else {
      const id = await ctx.db.insert("skills", {
        ...args,
        scrapedAt: Date.now(),
      });
      
      // Log activity
      await ctx.db.insert("activity", {
        type: "skill_listed",
        actor: args.author,
        skillId: args.id,
        timestamp: Date.now(),
      });
      
      return { created: true, id };
    }
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
      
      case 'rising':
        return skills
          .filter(s => s.level >= 4 && !s.verified)
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 10);
      
      default:
        return skills.slice(0, 10);
    }
  },
});

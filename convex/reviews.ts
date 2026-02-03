// convex/reviews.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get reviews for a skill
export const list = query({
  args: { 
    skillId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db.query("reviews")
      .withIndex("by_skill", q => q.eq("skillId", args.skillId))
      .order("desc")
      .take(args.limit || 20);
    
    const skill = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.skillId))
      .first();
    
    const total = await ctx.db.query("reviews")
      .withIndex("by_skill", q => q.eq("skillId", args.skillId))
      .collect();
    
    const avgRating = total.length > 0
      ? total.reduce((sum, r) => sum + r.rating, 0) / total.length
      : 0;
    
    // Calculate breakdown
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    total.forEach(r => breakdown[r.rating]++);
    
    return {
      reviews,
      total: total.length,
      average: Math.round(avgRating * 10) / 10,
      breakdown,
    };
  },
});

// Submit a review
export const submit = mutation({
  args: {
    skillId: v.string(),
    reviewerId: v.string(),
    rating: v.number(),
    comment: v.string(),
    paymentProof: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify rating is 1-5
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    
    // Verify skill exists
    const skill = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.skillId))
      .first();
    
    if (!skill) {
      throw new Error("Skill not found");
    }
    
    // Check for existing review from this user
    const existing = await ctx.db.query("reviews")
      .withIndex("by_skill", q => q.eq("skillId", args.skillId))
      .filter(q => q.eq(q.field("reviewerId"), args.reviewerId))
      .first();
    
    if (existing) {
      throw new Error("You have already reviewed this skill");
    }
    
    // Insert review
    const reviewId = await ctx.db.insert("reviews", {
      ...args,
      verified: true,
      timestamp: Date.now(),
    });
    
    // Log activity
    await ctx.db.insert("activity", {
      type: "review_submitted",
      actor: args.reviewerId,
      skillId: args.skillId,
      metadata: { rating: args.rating },
      timestamp: Date.now(),
    });
    
    // Update skill rating
    const allReviews = await ctx.db.query("reviews")
      .withIndex("by_skill", q => q.eq("skillId", args.skillId))
      .collect();
    
    const newAvg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    
    await ctx.db.patch(skill._id, {
      rating: Math.round(newAvg * 10) / 10,
    });
    
    return { id: reviewId };
  },
});

// Get reputation score for a skill
export const reputation = query({
  args: { skillId: v.string() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db.query("reviews")
      .withIndex("by_skill", q => q.eq("skillId", args.skillId))
      .collect();
    
    if (reviews.length === 0) {
      return { score: 0, level: 'unrated', confidence: 0, totalReviews: 0 };
    }
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const confidence = Math.min(reviews.length / 10, 1);
    
    let level = 'bronze';
    if (avgRating >= 4.5 && reviews.length >= 10) level = 'gold';
    else if (avgRating >= 4.0 && reviews.length >= 5) level = 'silver';
    
    return {
      score: Math.round(avgRating * 10) / 10,
      level,
      confidence,
      totalReviews: reviews.length,
      verifiedReviews: reviews.filter(r => r.verified).length,
    };
  },
});

// Get top rated skills
export const topRated = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const skills = await ctx.db.query("skills").collect();
    
    // Filter skills with at least 3 reviews
    const withReviews = [];
    for (const skill of skills) {
      const reviewCount = (await ctx.db.query("reviews")
        .withIndex("by_skill", q => q.eq("skillId", skill.id))
        .collect()).length;
      
      if (reviewCount >= 3) {
        withReviews.push({ ...skill, reviewCount });
      }
    }
    
    withReviews.sort((a, b) => b.rating - a.rating);
    return withReviews.slice(0, args.limit || 10);
  },
});

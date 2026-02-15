import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listBySkill = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .collect();
    // Attach user info
    const result = await Promise.all(
      reviews.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          ...r,
          userName: user?.name ?? "Anonymous",
          userImage: user?.imageUrl,
        };
      })
    );
    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    clerkId: v.string(),
    skillId: v.id("skills"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    // Check if already reviewed
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_skill", (q: any) =>
        q.eq("userId", user._id).eq("skillId", args.skillId)
      )
      .first();
    if (existing) throw new Error("You have already reviewed this skill");

    await ctx.db.insert("reviews", {
      skillId: args.skillId,
      userId: user._id,
      rating: args.rating,
      comment: args.comment,
      createdAt: Date.now(),
    });

    // Update skill average rating
    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .collect();
    const totalReviews = allReviews.length + 1; // include the one we just added
    const avgRating =
      (allReviews.reduce((sum, r) => sum + r.rating, 0) + args.rating) /
      totalReviews;

    await ctx.db.patch(args.skillId, {
      totalReviews,
      averageRating: Math.round(avgRating * 10) / 10,
    });
  },
});

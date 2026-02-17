import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const list = query({
  args: {
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let skills;
    if (args.category) {
      skills = await ctx.db
        .query("skills")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      skills = await ctx.db.query("skills").collect();
    }
    // Filter to active only by default
    return skills.filter((s) => s.status === "active");
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("skills").collect();
  },
});

export const get = query({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByAuthor = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("skills")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    description: v.string(),
    longDescription: v.optional(v.string()),
    category: v.string(),
    endpoint: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    pricePerCall: v.number(),
    tags: v.array(v.string()),
    exampleInput: v.optional(v.string()),
    exampleOutput: v.optional(v.string()),
    responseTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found. Please sign in.");

    const slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const skillId = await ctx.db.insert("skills", {
      slug,
      name: args.name,
      description: args.description,
      longDescription: args.longDescription,
      category: args.category,
      endpoint: args.endpoint,
      method: args.method,
      pricePerCall: args.pricePerCall,
      authorId: user._id,
      authorName: user.name ?? user.email,
      tags: args.tags,
      exampleInput: args.exampleInput,
      exampleOutput: args.exampleOutput,
      responseTime: args.responseTime,
      totalCalls: 0,
      totalReviews: 0,
      averageRating: 0,
      status: "active",
      createdAt: Date.now(),
    });
    return skillId;
  },
});

export const update = mutation({
  args: {
    id: v.id("skills"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    longDescription: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    pricePerCall: v.optional(v.number()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("pending"),
        v.literal("disabled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", "web-summarizer"))
      .first();
    if (existing) return "Already seeded";

    const skills = [
      {
        slug: "web-summarizer",
        name: "Web Summarizer",
        description: "Summarize any webpage into concise, structured notes.",
        longDescription: "Pass any URL and get back a clean, structured summary with key points, sentiment, and metadata.",
        category: "Research",
        endpoint: "/api/skills/web-summarizer",
        method: "POST" as const,
        pricePerCall: 0.003,
        authorName: "clawmart",
        tags: ["NLP", "Summarization", "Web"],
        exampleInput: '{ "url": "https://example.com/article" }',
        exampleOutput: '{ "summary": "Key findings...", "keyPoints": ["Point 1", "Point 2"], "sentiment": "neutral" }',
        responseTime: "~1.2s",
      },
      {
        slug: "code-reviewer",
        name: "Code Reviewer",
        description: "AI-powered code review with security and performance analysis.",
        longDescription: "Submit code snippets or diffs and receive detailed reviews covering security vulnerabilities, performance bottlenecks, and improvement suggestions.",
        category: "Development",
        endpoint: "/api/skills/code-reviewer",
        method: "POST" as const,
        pricePerCall: 0.005,
        authorName: "clawmart",
        tags: ["Code", "Security", "Review"],
        exampleInput: '{ "code": "function add(a, b) { return a + b; }", "language": "javascript" }',
        exampleOutput: '{ "issues": [], "suggestions": ["Add TypeScript types"], "score": 7.5 }',
        responseTime: "~2.1s",
      },
      {
        slug: "sentiment-analyzer",
        name: "Sentiment Analyzer",
        description: "Analyze sentiment and emotion in text with fine-grained scoring.",
        longDescription: "Advanced sentiment analysis with emotion breakdown, confidence scores, and entity-level sentiment.",
        category: "NLP",
        endpoint: "/api/skills/sentiment-analyzer",
        method: "POST" as const,
        pricePerCall: 0.001,
        authorName: "clawmart",
        tags: ["NLP", "Sentiment", "Emotion"],
        exampleInput: '{ "text": "I love this product but the shipping was terrible" }',
        exampleOutput: '{ "overall": "mixed", "score": 0.35, "emotions": { "joy": 0.6, "anger": 0.3 } }',
        responseTime: "~0.4s",
      },
      {
        slug: "image-describer",
        name: "Image Describer",
        description: "Generate detailed natural language descriptions of images.",
        longDescription: "Upload an image URL and receive a detailed description including objects, scene composition, and accessibility-ready alt text.",
        category: "Vision",
        endpoint: "/api/skills/image-describer",
        method: "POST" as const,
        pricePerCall: 0.008,
        authorName: "clawmart",
        tags: ["Vision", "OCR", "Accessibility"],
        exampleInput: '{ "imageUrl": "https://example.com/photo.jpg" }',
        exampleOutput: '{ "description": "A sunset over a mountain lake...", "objects": ["mountain", "lake"], "altText": "Scenic sunset..." }',
        responseTime: "~3.2s",
      },
      {
        slug: "data-extractor",
        name: "Data Extractor",
        description: "Extract structured data from unstructured text documents.",
        longDescription: "Feed in raw text and get back clean structured JSON with extracted entities, dates, amounts, and relationships.",
        category: "Data",
        endpoint: "/api/skills/data-extractor",
        method: "POST" as const,
        pricePerCall: 0.004,
        authorName: "clawmart",
        tags: ["ETL", "Extraction", "Structured Data"],
        exampleInput: '{ "text": "Invoice #1234 from Acme Corp, due 2024-03-15, total $5,430.00" }',
        exampleOutput: '{ "invoice_number": "1234", "company": "Acme Corp", "due_date": "2024-03-15", "amount": 5430.00 }',
        responseTime: "~1.8s",
      },
      {
        slug: "translate-pro",
        name: "Translate Pro",
        description: "High-quality translation across 50+ languages with context awareness.",
        longDescription: "Context-aware translation that preserves tone, idioms, and domain-specific terminology. Supports 50+ language pairs.",
        category: "NLP",
        endpoint: "/api/skills/translate-pro",
        method: "POST" as const,
        pricePerCall: 0.002,
        authorName: "clawmart",
        tags: ["Translation", "NLP", "i18n"],
        exampleInput: '{ "text": "The quick brown fox", "targetLang": "es" }',
        exampleOutput: '{ "translation": "El rápido zorro marrón", "confidence": 0.95, "sourceLang": "en" }',
        responseTime: "~0.8s",
      },
    ];

    for (const skill of skills) {
      await ctx.db.insert("skills", {
        ...skill,
        totalCalls: 0,
        totalReviews: 0,
        averageRating: 0,
        status: "active",
        createdAt: Date.now(),
      });
    }
    return `Seeded ${skills.length} skills`;
  },
});

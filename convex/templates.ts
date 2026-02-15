import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("templates").collect();
  },
});

export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const seed = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("templates").first();
    if (existing) return "already seeded";

    const templates = [
      {
        name: "Sales Team",
        industry: "Sales",
        description: "AI-powered sales team that researches leads, writes outreach, manages your CRM, and preps for meetings.",
        icon: "TrendingUp",
        color: "from-blue-500 to-cyan-500",
        agents: [
          {
            name: "Lead Researcher",
            role: "Research & Intelligence",
            description: "Finds and qualifies potential leads using web research and data enrichment.",
            systemPrompt: "You are an expert B2B lead researcher. Your job is to find qualified prospects, gather company intelligence, identify decision makers, and score leads based on fit criteria.",
            tools: ["web_search", "company_lookup", "linkedin_search"],
          },
          {
            name: "Outreach Writer",
            role: "Communication",
            description: "Crafts personalized cold emails, follow-ups, and LinkedIn messages.",
            systemPrompt: "You are a world-class sales copywriter. Write personalized, compelling outreach messages that get responses. Use research data to personalize every touchpoint.",
            tools: ["email_draft", "template_library", "personalization"],
          },
          {
            name: "CRM Manager",
            role: "Operations",
            description: "Keeps your CRM updated with deal stages, notes, and next steps.",
            systemPrompt: "You are a meticulous CRM manager. Keep all deal records updated, track pipeline stages, log interactions, and flag deals that need attention.",
            tools: ["crm_update", "pipeline_tracker", "task_creator"],
          },
          {
            name: "Meeting Prep Agent",
            role: "Strategy",
            description: "Prepares briefings and talking points before every sales call.",
            systemPrompt: "You are a sales strategist. Before every meeting, prepare comprehensive briefings including prospect research, talking points, objection handling, and recommended next steps.",
            tools: ["calendar_read", "company_lookup", "document_generator"],
          },
        ],
      },
      {
        name: "Marketing Agency",
        industry: "Marketing",
        description: "Full marketing team that creates content, optimizes SEO, manages social media, and tracks analytics.",
        icon: "Megaphone",
        color: "from-purple-500 to-pink-500",
        agents: [
          {
            name: "Content Writer",
            role: "Content Creation",
            description: "Writes blog posts, articles, and marketing copy aligned with brand voice.",
            systemPrompt: "You are an expert content writer. Create engaging, SEO-optimized content that matches the brand voice. Write blog posts, articles, email newsletters, and website copy.",
            tools: ["content_generator", "seo_optimizer", "brand_guide"],
          },
          {
            name: "SEO Analyst",
            role: "Search Optimization",
            description: "Monitors rankings, finds keyword opportunities, and optimizes content.",
            systemPrompt: "You are an SEO expert. Analyze keyword opportunities, track rankings, audit content for SEO best practices, and recommend optimization strategies.",
            tools: ["keyword_research", "rank_tracker", "site_audit"],
          },
          {
            name: "Social Media Manager",
            role: "Social Media",
            description: "Creates and schedules posts across platforms, engages with followers.",
            systemPrompt: "You are a social media expert. Create engaging posts for all platforms, plan content calendars, respond to comments, and grow audience engagement.",
            tools: ["post_scheduler", "analytics_reader", "image_generator"],
          },
          {
            name: "Analytics Reporter",
            role: "Data & Reporting",
            description: "Tracks KPIs, generates reports, and provides actionable insights.",
            systemPrompt: "You are a marketing analytics expert. Track campaign performance, generate weekly/monthly reports, identify trends, and recommend data-driven optimizations.",
            tools: ["analytics_dashboard", "report_generator", "data_visualizer"],
          },
        ],
      },
      {
        name: "Real Estate Team",
        industry: "Real Estate",
        description: "AI team for real estate firms — analyzes deals, researches markets, handles outreach, and drafts documents.",
        icon: "Building",
        color: "from-green-500 to-emerald-500",
        agents: [
          {
            name: "Deal Analyzer",
            role: "Analysis",
            description: "Evaluates property deals using comps, financials, and market data.",
            systemPrompt: "You are a real estate investment analyst. Evaluate property deals by analyzing comparable sales, rental yields, cap rates, cash flow projections, and market trends.",
            tools: ["property_lookup", "financial_calculator", "comp_analyzer"],
          },
          {
            name: "Market Researcher",
            role: "Research",
            description: "Tracks market trends, neighborhood data, and development plans.",
            systemPrompt: "You are a real estate market researcher. Monitor market trends, track neighborhood developments, analyze demographic data, and identify emerging opportunities.",
            tools: ["market_data", "demographic_analyzer", "news_monitor"],
          },
          {
            name: "Outreach Agent",
            role: "Client Relations",
            description: "Manages client communications, follow-ups, and appointment scheduling.",
            systemPrompt: "You are a real estate client relationship manager. Handle prospect outreach, schedule showings, send follow-ups, and nurture leads through the buying/selling process.",
            tools: ["email_sender", "calendar_manager", "crm_update"],
          },
          {
            name: "Document Drafter",
            role: "Documentation",
            description: "Prepares offers, listing descriptions, and transaction documents.",
            systemPrompt: "You are a real estate documentation specialist. Draft property listings, prepare offer letters, create market reports, and organize transaction paperwork.",
            tools: ["document_generator", "template_library", "e_sign"],
          },
          {
            name: "Property Scout",
            role: "Sourcing",
            description: "Scans listings and off-market opportunities matching client criteria.",
            systemPrompt: "You are a property sourcing specialist. Search MLS listings, identify off-market opportunities, match properties to buyer criteria, and set up automated alerts.",
            tools: ["mls_search", "alert_manager", "property_matcher"],
          },
        ],
      },
      {
        name: "Customer Support",
        industry: "Customer Support",
        description: "AI support team that handles tickets, manages knowledge bases, and escalates complex issues.",
        icon: "Headphones",
        color: "from-orange-500 to-yellow-500",
        agents: [
          {
            name: "Frontline Support",
            role: "Tier 1 Support",
            description: "Handles initial customer inquiries and common issues.",
            systemPrompt: "You are a friendly, efficient customer support agent. Handle incoming inquiries, resolve common issues, and provide helpful answers using the knowledge base. Escalate complex issues appropriately.",
            tools: ["knowledge_base", "ticket_manager", "canned_responses"],
          },
          {
            name: "Technical Support",
            role: "Tier 2 Support",
            description: "Handles escalated technical issues requiring deeper investigation.",
            systemPrompt: "You are a technical support specialist. Investigate complex issues, troubleshoot technical problems, and provide detailed solutions. Document fixes for the knowledge base.",
            tools: ["debug_tools", "system_logs", "knowledge_base"],
          },
          {
            name: "Knowledge Manager",
            role: "Documentation",
            description: "Maintains and updates the help center and internal knowledge base.",
            systemPrompt: "You are a knowledge management specialist. Create and update help articles, FAQ entries, and internal documentation. Identify knowledge gaps from support tickets.",
            tools: ["content_editor", "analytics_reader", "article_publisher"],
          },
          {
            name: "Customer Success",
            role: "Retention",
            description: "Proactively reaches out to at-risk customers and manages onboarding.",
            systemPrompt: "You are a customer success manager. Monitor customer health scores, identify at-risk accounts, manage onboarding flows, and proactively reach out to ensure customer satisfaction.",
            tools: ["health_monitor", "email_sender", "survey_creator"],
          },
        ],
      },
      {
        name: "Legal & Compliance",
        industry: "Legal",
        description: "AI legal team for research, document drafting, client intake, and compliance monitoring.",
        icon: "Scale",
        color: "from-red-500 to-rose-500",
        agents: [
          {
            name: "Legal Researcher",
            role: "Research",
            description: "Researches case law, statutes, and regulatory requirements.",
            systemPrompt: "You are a legal research specialist. Research relevant case law, statutes, regulations, and legal precedents. Provide comprehensive memos with citations and analysis.",
            tools: ["legal_database", "case_search", "citation_manager"],
          },
          {
            name: "Document Drafter",
            role: "Documentation",
            description: "Drafts contracts, agreements, and legal documents from templates.",
            systemPrompt: "You are a legal document drafting specialist. Create contracts, agreements, NDAs, and other legal documents. Ensure compliance with applicable laws and use approved templates.",
            tools: ["template_library", "document_generator", "clause_library"],
          },
          {
            name: "Client Intake Agent",
            role: "Client Management",
            description: "Manages new client onboarding, collects information, and schedules consultations.",
            systemPrompt: "You are a legal intake specialist. Manage new client inquiries, collect necessary information, perform conflict checks, and schedule initial consultations.",
            tools: ["intake_form", "calendar_manager", "conflict_checker"],
          },
          {
            name: "Compliance Monitor",
            role: "Compliance",
            description: "Monitors regulatory changes and ensures organizational compliance.",
            systemPrompt: "You are a compliance monitoring specialist. Track regulatory changes, audit internal processes for compliance, create compliance reports, and flag potential issues.",
            tools: ["regulatory_feed", "audit_tracker", "alert_manager"],
          },
        ],
      },
    ];

    for (const template of templates) {
      await ctx.db.insert("templates", template);
    }
    return "seeded";
  },
});

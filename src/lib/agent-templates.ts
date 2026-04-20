/**
 * Pre-built AI agent roles available to hire on clawmart.
 *
 * Sourced from openclaw-workforce/templates/*.yaml. Hardcoded here intentionally
 * for v0 — validates willingness-to-pay before we wire the real Convex-backed
 * catalog. Each entry is the marketing surface for a role; the actual agent
 * definition (system prompt, tools, channels) lives in the workforce repo.
 */

export interface AgentTemplate {
  slug: string;
  role: string;
  description: string;
  pricePerMonth: number;
  sampleOutput: string;
}

export const agentTemplates: AgentTemplate[] = [
  {
    slug: "executive-assistant",
    role: "Executive Assistant",
    description:
      "Your inbox, calendar, and coordination handled. Triages email, schedules meetings, summarizes the day, drafts replies you approve.",
    pricePerMonth: 99,
    sampleOutput:
      "Morning brief: 3 urgent threads flagged, Acme call moved to 2pm, draft reply to Priya ready for your review.",
  },
  {
    slug: "research-agent",
    role: "Research Agent",
    description:
      "Deep-dive research on any topic. Scrapes, synthesizes, cites sources. Delivers briefs to Slack or a shared doc.",
    pricePerMonth: 49,
    sampleOutput:
      "Brief on Series A SaaS pricing benchmarks (2026): 12 sources, 8 key findings, comparison table in #research.",
  },
  {
    slug: "sales-crm",
    role: "Sales SDR",
    description:
      "Pipeline outreach on autopilot. Personalized first-touch emails, follow-up sequences, meeting bookings. Hands off qualified leads to you.",
    pricePerMonth: 149,
    sampleOutput:
      "Booked 4 discovery calls this week. 2 qualified leads handed off — Acme (Series B, 120 reps) and Northwind (PLG, 40 reps).",
  },
  {
    slug: "content-writer",
    role: "Content Writer",
    description:
      "Long-form and social content, on-brand and on-deadline. Blog posts, LinkedIn, threads, newsletter drafts — you approve, it publishes.",
    pricePerMonth: 79,
    sampleOutput:
      "Draft ready: \"Why your AI agent is a cost center (and how to fix it)\" — 1,240 words, 3 LinkedIn variants, awaiting approval.",
  },
  {
    slug: "devops-monitor",
    role: "DevOps Monitor",
    description:
      "Watches your infra 24/7. Summarizes logs, pages you on real issues (not noise), drafts runbooks from incidents.",
    pricePerMonth: 79,
    sampleOutput:
      "p99 latency on /checkout spiked to 1.8s at 03:14 UTC — correlated with deploy abc123. Rollback drafted, runbook linked.",
  },
];

export function getAgentTemplateBySlug(slug: string): AgentTemplate | undefined {
  return agentTemplates.find((t) => t.slug === slug);
}

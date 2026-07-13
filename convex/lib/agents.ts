/**
 * Company Studio founding-team agents — pure definitions (no Convex imports).
 *
 * Each agent takes the user's idea plus the assets produced by earlier steps
 * and must return STRICT JSON matching its contract (rendered by the studio UI
 * and /c/[slug]). The engine (convex/agents.ts) owns execution and retries.
 *
 * Trust rules (CLAUDE.md) bind GENERATED copy too: agents are forbidden from
 * inventing testimonials, customer counts, revenue, ratings, press mentions,
 * or guarantees. Every company here is pre-launch.
 */

export const PIPELINE = [
  "strategist",
  "brand",
  "product",
  "landing",
  "marketing",
] as const;

export type AgentKey = (typeof PIPELINE)[number];

// Cheap-and-reliable default for workers; premium model where quality compounds.
export const WORKER_MODEL = "google/gemini-2.5-flash";
export const PREMIUM_MODEL = "anthropic/claude-sonnet-4.6";

export type ChatMessage = { role: "system" | "user"; content: string };

export interface AgentDef {
  title: string; // shown in the live feed
  model: string;
  maxTokens: number;
  buildMessages(idea: string, assets: Partial<Record<AgentKey, string>>): ChatMessage[];
}

const TRUST_RULES = `Hard rules for everything you write:
- This company is PRE-LAUNCH. Never invent testimonials, customer quotes, user counts, revenue figures, star ratings, press mentions, or "as seen in" logos.
- Never promise guaranteed results.
- Be concrete and specific to THIS idea — no generic filler.
Return ONLY a single valid JSON object matching the contract. No markdown, no code fences, no commentary.`;

function assetBlock(
  assets: Partial<Record<AgentKey, string>>,
  keys: AgentKey[]
): string {
  return keys
    .filter((k) => assets[k])
    .map((k) => `--- ${k.toUpperCase()} (from an earlier agent) ---\n${assets[k]}`)
    .join("\n\n");
}

export const AGENTS: Record<AgentKey, AgentDef> = {
  strategist: {
    title: "Strategist",
    model: PREMIUM_MODEL,
    maxTokens: 3000,
    buildMessages(idea) {
      return [
        {
          role: "system",
          content: `You are a startup strategist on a founding team. Turn a raw idea into a sharp, honest business plan.
${TRUST_RULES}
JSON contract:
{
  "positioning": "one tight paragraph: what this is, for whom, why now",
  "problem": "the pain, concretely",
  "solution": "how the product solves it",
  "icp": ["2-4 ideal customer profiles"],
  "businessModel": "how it makes money",
  "competitors": [{"name": "...", "angle": "how we differ"}],
  "risks": ["3-5 real risks, stated plainly"],
  "next90Days": ["5-7 concrete milestones"]
}`,
        },
        { role: "user", content: `The idea:\n${idea}` },
      ];
    },
  },

  brand: {
    title: "Brand Designer",
    model: WORKER_MODEL,
    maxTokens: 1500,
    buildMessages(idea, assets) {
      return [
        {
          role: "system",
          content: `You are a brand designer on a founding team. Name the company and define its identity.
${TRUST_RULES}
Naming: short (1-2 words), pronounceable, no trademark-famous names, no "AI" suffix cliches unless genuinely apt.
Colors must be accessible hex values that work on a dark page.
JSON contract:
{
  "name": "CompanyName",
  "tagline": "under 8 words",
  "oneLiner": "one sentence for a stranger",
  "voice": "2-3 adjectives + one sentence on tone",
  "colors": {"primary": "#hex", "accent": "#hex", "background": "#hex", "foreground": "#hex"}
}`,
        },
        {
          role: "user",
          content: `The idea:\n${idea}\n\n${assetBlock(assets, ["strategist"])}`,
        },
      ];
    },
  },

  product: {
    title: "Product Lead",
    model: WORKER_MODEL,
    maxTokens: 3000,
    buildMessages(idea, assets) {
      return [
        {
          role: "system",
          content: `You are a product lead on a founding team. Spec the SaaS: what gets built, in what order, at what price.
${TRUST_RULES}
Pricing must be plausible for the market — plain numbers like "$29/mo", or "Free" for an entry tier.
JSON contract:
{
  "summary": "one paragraph: the product in plain words",
  "coreFeatures": [{"title": "...", "description": "1-2 sentences"}],
  "mvpCut": ["the 3-5 features that ship first"],
  "laterIdeas": ["3-5 post-MVP ideas"],
  "pricing": [{"tier": "...", "price": "...", "includes": ["..."]}]
}`,
        },
        {
          role: "user",
          content: `The idea:\n${idea}\n\n${assetBlock(assets, ["strategist", "brand"])}`,
        },
      ];
    },
  },

  landing: {
    title: "Landing Page Engineer",
    model: PREMIUM_MODEL,
    maxTokens: 4000,
    buildMessages(idea, assets) {
      return [
        {
          role: "system",
          content: `You are a landing-page copywriter/engineer on a founding team. Produce the content for the company's public landing page. It will be rendered by a fixed template — your JSON IS the page.
${TRUST_RULES}
The only call-to-action available is a "join the waitlist" email form, so every "cta" string must fit that (e.g. "Join the waitlist", "Get early access").
JSON contract:
{
  "hero": {"headline": "punchy, specific", "subheadline": "1-2 sentences", "cta": "..."},
  "features": [{"title": "...", "description": "1-2 sentences"}],   // exactly 3-6
  "how": [{"step": "short label", "description": "one sentence"}],  // exactly 3
  "pricing": [{"tier": "...", "price": "...", "includes": ["..."], "highlighted": false}],
  "faq": [{"q": "...", "a": "..."}],                                 // 3-5, honest answers
  "finalCta": {"headline": "...", "cta": "..."}
}`,
        },
        {
          role: "user",
          content: `The idea:\n${idea}\n\n${assetBlock(assets, [
            "strategist",
            "brand",
            "product",
          ])}`,
        },
      ];
    },
  },

  marketing: {
    title: "Marketing Lead",
    model: WORKER_MODEL,
    maxTokens: 2500,
    buildMessages(idea, assets) {
      return [
        {
          role: "system",
          content: `You are a marketing lead on a founding team. Write the launch kit the founder fires manually.
${TRUST_RULES}
Tweets must each stand alone (no thread numbering), under 280 chars.
JSON contract:
{
  "tweets": ["5 distinct launch tweets"],
  "linkedinPost": "one launch post, line breaks as \\n",
  "coldEmail": {"subject": "...", "body": "short, honest, no hype, line breaks as \\n"},
  "launchChecklist": ["5-8 concrete launch-week actions"]
}`,
        },
        {
          role: "user",
          content: `The idea:\n${idea}\n\n${assetBlock(assets, [
            "strategist",
            "brand",
            "product",
          ])}`,
        },
      ];
    },
  },
};

// ---------------------------------------------------------------------------
// Output handling helpers (pure — unit-testable)
// ---------------------------------------------------------------------------

/**
 * Extract a JSON object from model output: strips code fences and anything
 * outside the outermost braces, then parses. Throws on anything unparseable.
 */
export function extractJson(text: string): Record<string, unknown> {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found");
  const parsed = JSON.parse(stripped.slice(start, end + 1));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("output is not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

/** "Acme Labs!" -> "acme-labs". Falls back to "company" for degenerate input. */
export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "company";
}

/** Short non-cryptographic suffix to dodge slug collisions. */
export function slugSuffix(): string {
  const bytes = new Uint8Array(3);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

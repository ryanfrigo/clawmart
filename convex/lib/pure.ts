/**
 * Pure logic for the AI Visibility Fix Kit backend.
 *
 * IMPORTANT: no Convex imports here. This module is imported by Convex
 * functions AND directly by vitest (Track C unit tests). Keep it plain
 * TypeScript with zero side effects.
 */

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const PROMPT_SET_VERSION = "v1";

/** AI crawlers we audit robots.txt access for. Plain-text names, nominative use only. */
export const AI_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
] as const;

// ---------------------------------------------------------------------------
// Types (binding — Tracks B/C import these)
// ---------------------------------------------------------------------------

export type Tier = "invisible" | "faint" | "mixed" | "visible";

export type Interval = { low: number; high: number; point: number };

export type ScoreBlock = {
  samples: number;
  mentions: number;
  interval: Interval;
};

export type FixArtifact = {
  id: string;
  title: string;
  mechanism: "grounded" | "parametric";
  latencyNote: string;
  body: string;
  pasteTarget: string;
  priority: number;
};

export type CrawlResult = {
  url: string;
  fetchedAt: number;
  ok: boolean;
  error?: string;
  title: string;
  description: string;
  headings: Array<{ level: number; text: string }>;
  schemaTypes: string[];
  robots: {
    fetched: boolean;
    aiBots: Array<{ bot: string; allowed: boolean }>;
  };
  textExcerpt: string; // <= 20K chars
  keyPages: Array<{ url: string; label: string }>; // same-origin nav links, <= 5
};

export type ReportResult = {
  promptSetVersion: string;
  measuredAt: number;
  models: Array<{
    id: string;
    grounded: boolean;
    samples: number;
    mentions: number;
    interval: Interval;
  }>;
  overall: { grounded: ScoreBlock; ungrounded: ScoreBlock };
  shareOfVoice: Array<{ name: string; mentions: number; isYou: boolean }>;
  topFindings: string[];
  fixes: FixArtifact[];
  aeoAudit: Array<{ id: string; label: string; pass: boolean; detail: string }>;
  methodologyNote: string;
};

export type PromptSpec = { id: string; text: string; intent: string };

/** Minimal sample shape needed to compute a ReportResult. */
export type SampleLite = {
  promptId: string;
  model: string;
  grounded: boolean;
  answer: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
  citedUrls: string[];
};

// ---------------------------------------------------------------------------
// Domain normalization
// ---------------------------------------------------------------------------

const LABEL_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Accepts a URL or bare domain. Lowercases, strips scheme/path/port and a
 * leading "www.". Rejects localhost, *.local/*.internal, IP literals, and
 * anything that does not look like a public hostname. Keeps subdomains.
 * IDN input is normalized to punycode (via WHATWG URL).
 */
export function normalizeDomain(input: string): string | null {
  if (typeof input !== "string") return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = "https://" + s;
  let host: string;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    host = u.hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, "");
  if (host.startsWith("www.")) host = host.slice(4);
  if (!host || host.length > 253) return null;
  if (host === "localhost") return null;
  if (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return null;
  }
  if (isIpLiteral(host)) return null;
  const labels = host.split(".");
  if (labels.length < 2) return null;
  if (!labels.every((l) => l.length >= 1 && l.length <= 63 && LABEL_RE.test(l))) {
    return null;
  }
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || /^\d+$/.test(tld)) return null;
  return host;
}

export function isIpLiteral(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "");
  if (h.includes(":")) return true; // IPv6
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h);
}

// ---------------------------------------------------------------------------
// SSRF guards
// ---------------------------------------------------------------------------

/**
 * True when an IP (v4 or v6 string form) is private / loopback / link-local /
 * otherwise unsafe to fetch. Fails CLOSED: malformed input => true.
 */
export function isPrivateIp(ip: string): boolean {
  if (typeof ip !== "string" || !ip) return true;
  let addr = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);

  if (!addr.includes(":")) {
    // IPv4 dotted quad
    const parts = addr.split(".");
    if (parts.length !== 4) return true;
    const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
    if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return true;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 169 && b === 254) return true; // link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true; // 192.0.0/24 + 192.0.2/24 test
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a === 198 && b === 51) return true; // 198.51.100/24 test
    if (a === 203 && b === 0) return true; // 203.0.113/24 test
    if (a >= 224) return true; // multicast / reserved / broadcast
    return false;
  }

  // IPv6
  if (addr.includes(".")) {
    // IPv4-mapped, e.g. ::ffff:192.168.0.1 — judge the embedded v4
    const v4 = addr.slice(addr.lastIndexOf(":") + 1);
    return isPrivateIp(v4);
  }
  if (addr.startsWith("::")) return true; // unspecified, loopback, hex-mapped — fail closed
  const first = addr.split(":")[0];
  if (!/^[0-9a-f]{1,4}$/.test(first)) return true;
  const v = parseInt(first, 16);
  if (v === 0) return true;
  if ((v & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((v & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((v & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (v === 0x2001 && addr.split(":")[1] === "db8") return true; // documentation
  return false;
}

/**
 * Static URL safety: http/https only, no credentials, hostname is not
 * localhost/.local/.internal and not an IP literal in a private range.
 * DNS-resolution checks (incl. redirect hops) are the crawler's job.
 */
export function isSafeUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  let host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (!host) return false;
  if (host === "localhost") return false;
  if (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  if (host.includes(":")) return !isPrivateIp(host); // IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return !isPrivateIp(host);
  return true;
}

// ---------------------------------------------------------------------------
// Mention detection
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function brandPattern(name: string): RegExp | null {
  const tokens = name.trim().split(/[\s\-]+/).filter(Boolean).map(escapeRegExp);
  if (tokens.length === 0) return null;
  // "Claw Mart" / "claw-mart" / "ClawMart" all match; word-ish boundaries.
  return new RegExp(
    `(?<![a-z0-9])${tokens.join("[\\s\\-]?")}(?![a-z0-9])`,
    "i"
  );
}

/**
 * Word-boundary match on the brand name (case-insensitive, tolerating
 * space/hyphen variants) OR a mention of the domain itself.
 */
export function detectMention(
  answer: string,
  brandName: string,
  domain: string
): boolean {
  if (!answer) return false;
  const p = brandPattern(brandName);
  if (p && p.test(answer)) return true;
  if (domain) {
    const d = new RegExp(
      `(?<![a-z0-9])${escapeRegExp(domain.toLowerCase())}(?![a-z0-9])`,
      "i"
    );
    if (d.test(answer)) return true;
  }
  return false;
}

/** Returns the subset of competitor names mentioned in the answer (original casing, deduped). */
export function detectCompetitors(
  answer: string,
  competitors: string[]
): string[] {
  if (!answer || !competitors?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of competitors) {
    const key = c.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const p = brandPattern(c);
    if (p && p.test(answer)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Wilson score interval, z = 1.96 (95%). Returns 0..1 floats. n<=0 => total uncertainty. */
export function wilsonInterval(
  successes: number,
  n: number
): Interval {
  if (n <= 0) return { low: 0, high: 1, point: 0 };
  const z = 1.96;
  const z2 = z * z;
  const p = clamp01(successes / n);
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { low: clamp01(center - half), high: clamp01(center + half), point: p };
}

/**
 * Free-check tier by grounded mention rate:
 * 0 mentions => invisible; <20% => faint; 20–60% => mixed; >60% => visible.
 */
export function tierFor(mentions: number, samples: number): Tier {
  if (samples <= 0 || mentions <= 0) return "invisible";
  const rate = mentions / samples;
  if (rate < 0.2) return "faint";
  if (rate <= 0.6) return "mixed";
  return "visible";
}

// ---------------------------------------------------------------------------
// Tokens & hashing
// ---------------------------------------------------------------------------

/** 128-bit random token as 32 hex chars, via crypto.getRandomValues. */
export function checksumToken(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** FNV-1a 32-bit — deterministic seed for mock-mode answers. Not cryptographic. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** "clawmart.co" -> "Clawmart"; "get-widget.io" -> "Get Widget". */
export function brandNameFromDomain(domain: string): string {
  const label = domain.split(".")[0] ?? domain;
  return label
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Stripe webhook decision table (pure — unit-tested by Track C)
// ---------------------------------------------------------------------------

export type WebhookDecision = "fulfill" | "fail" | "ignore";

/**
 * Idempotency lives here: any report status other than "pending_payment"
 * makes every event a no-op.
 */
export function webhookDecision(
  eventType: string,
  paymentStatus: string | null | undefined,
  reportStatus: string | null | undefined
): WebhookDecision {
  if (reportStatus !== "pending_payment") return "ignore";
  switch (eventType) {
    case "checkout.session.completed":
      return paymentStatus === "paid" ? "fulfill" : "ignore";
    case "checkout.session.async_payment_succeeded":
      return "fulfill";
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return "fail";
    default:
      return "ignore";
  }
}

// ---------------------------------------------------------------------------
// Prompt Set v1 (versioned; see /methodology)
// ---------------------------------------------------------------------------

type Template = { intent: string; text: string };

const FREE_TEMPLATES_V1: Template[] = [
  { intent: "best-tool", text: "What are the best {category} right now?" },
  { intent: "recommendation", text: "Can you recommend {category} for a small team?" },
  { intent: "top-list", text: "List the top 5 {category} and what each is best at." },
  { intent: "comparison", text: "How do the leading {category} compare?" },
  { intent: "alternatives", text: "What are good alternatives to {competitor1}?" },
  { intent: "how-to-choose", text: "How should I choose between {category}? Name specific products." },
  { intent: "pricing", text: "What are the most affordable {category} worth using?" },
  { intent: "use-case", text: "Which {category} are best for an early-stage startup?" },
  { intent: "trust", text: "Which {category} do people actually recommend, and why?" },
  { intent: "use-case", text: "I need {category} for my business — what should I look at first?" },
];

const PAID_TEMPLATES_V1: Template[] = [
  { intent: "best-tool", text: "What are the best {category} in 2026?" },
  { intent: "best-tool", text: "What are the top-rated {category} right now?" },
  { intent: "best-tool", text: "Which {category} are considered best-in-class?" },
  { intent: "best-tool", text: "If you had to pick one of the {category} to start with today, which would it be and why?" },
  { intent: "recommendation", text: "Can you recommend {category} for a small business?" },
  { intent: "recommendation", text: "What {category} would you recommend for a solo founder?" },
  { intent: "recommendation", text: "Recommend {category} for a mid-sized company and explain the tradeoffs." },
  { intent: "recommendation", text: "A friend asked me which of the {category} to use — what should I tell them?" },
  { intent: "comparison", text: "Compare the most popular {category} on features and pricing." },
  { intent: "comparison", text: "What are the main differences between the leading {category}?" },
  { intent: "comparison", text: "Which of the well-known {category} has the best value for money?" },
  { intent: "comparison", text: "Put together a short comparison of the top 3 {category}." },
  { intent: "alternatives", text: "What are the best alternatives to {competitor1}?" },
  { intent: "alternatives", text: "I'm not happy with {competitor2} — what should I switch to?" },
  { intent: "alternatives", text: "What's a cheaper alternative to {competitor3}?" },
  { intent: "alternatives", text: "Which {category} compete directly with {competitor1}?" },
  { intent: "pricing", text: "How much do {category} typically cost?" },
  { intent: "pricing", text: "What are the most affordable {category} that are still good?" },
  { intent: "pricing", text: "Are there free or low-cost {category} worth trying?" },
  { intent: "trust", text: "Which {category} do users rate most highly, and why?" },
  { intent: "trust", text: "What do reviews say about the most popular {category}?" },
  { intent: "trust", text: "Which {category} are considered the most reliable?" },
  { intent: "use-case", text: "Which {category} are best for an early-stage startup?" },
  { intent: "use-case", text: "Which {category} work best for e-commerce businesses?" },
  { intent: "use-case", text: "Which {category} are best for agencies managing multiple clients?" },
  { intent: "use-case", text: "Which {category} are easiest to set up without a developer?" },
  { intent: "use-case", text: "Which {category} scale well as a company grows?" },
  { intent: "use-case", text: "Which {category} are best for a non-technical marketing team?" },
  { intent: "how-to-choose", text: "How do I choose between {category}? Name specific products to shortlist." },
  { intent: "how-to-choose", text: "What should I look for when evaluating {category}?" },
  { intent: "how-to-choose", text: "What questions should I ask before buying one of the {category}?" },
  { intent: "top-list", text: "List the top 5 {category} with one line on each." },
  { intent: "top-list", text: "Give me a shortlist of {category} to evaluate this week." },
  { intent: "top-list", text: "What are 3 {category} you'd shortlist first, and why those?" },
  { intent: "integration", text: "Which {category} integrate well with common marketing stacks?" },
  { intent: "integration", text: "Which {category} have the best API or integrations?" },
  { intent: "newcomers", text: "Are there any newer {category} that are gaining traction?" },
  { intent: "newcomers", text: "Which up-and-coming {category} should I keep an eye on?" },
  { intent: "switching", text: "What's involved in switching between {category}? Which make it easiest?" },
  { intent: "switching", text: "Which of the {category} have the lowest lock-in?" },
];

function fillTemplate(
  t: Template,
  category: string,
  competitors: string[]
): string {
  const comp = (i: number) =>
    competitors.length > 0
      ? competitors[(i - 1) % competitors.length]
      : `the most popular option in ${category}`;
  return t.text
    .replace(/\{category\}/g, category)
    .replace(/\{competitor1\}/g, comp(1))
    .replace(/\{competitor2\}/g, comp(2))
    .replace(/\{competitor3\}/g, comp(3));
}

/** 10 buyer-intent prompts (free check), Prompt Set v1. Deterministic. */
export function buildFreeCheckPrompts(
  category: string,
  competitors: string[]
): PromptSpec[] {
  return FREE_TEMPLATES_V1.map((t, i) => ({
    id: `${PROMPT_SET_VERSION}-free-${String(i + 1).padStart(2, "0")}`,
    text: fillTemplate(t, category, competitors),
    intent: t.intent,
  }));
}

/** 40 buyer-intent prompts (paid kit), Prompt Set v1. Deterministic fixtures. */
export function buildPaidPromptSet(
  category: string,
  competitors: string[]
): PromptSpec[] {
  return PAID_TEMPLATES_V1.map((t, i) => ({
    id: `${PROMPT_SET_VERSION}-paid-${String(i + 1).padStart(2, "0")}`,
    text: fillTemplate(t, category, competitors),
    intent: t.intent,
  }));
}

/** Keyword intent classifier for live-mode LLM-generated prompt texts. */
export function classifyIntent(text: string): string {
  const t = text.toLowerCase();
  if (/(alternative|switch|instead of)/.test(t)) return "alternatives";
  if (/(compare|comparison|difference| vs |versus)/.test(t)) return "comparison";
  if (/(price|pricing|cost|cheap|affordable|budget|free)/.test(t)) return "pricing";
  if (/(review|reliable|trust|rate|reputation)/.test(t)) return "trust";
  if (/(recommend|suggest|should i use|what should)/.test(t)) return "recommendation";
  if (/(top \d|list the top|shortlist|top-rated)/.test(t)) return "top-list";
  if (/(integrat|api|works with|connect)/.test(t)) return "integration";
  if (/(choose|evaluate|look for|questions)/.test(t)) return "how-to-choose";
  if (/best/.test(t)) return "best-tool";
  return "use-case";
}

// ---------------------------------------------------------------------------
// Mock-mode brand profile (shared by mock crawler + mock LLM inference)
// ---------------------------------------------------------------------------

const MOCK_CATEGORY_POOL = [
  "project management tools",
  "email marketing platforms",
  "AI visibility tools",
  "customer analytics platforms",
  "customer support tools",
  "website builders",
];

const MOCK_COMPETITOR_POOL = [
  "AcmeRank",
  "BrandLens",
  "EchoMetric",
  "Quantiva",
  "NorthTide",
  "SignalBay",
];

/** Deterministic brand/category/competitors for LLM_MODE=mock. No network. */
export function mockBrandProfile(domain: string): {
  brandName: string;
  category: string;
  competitors: string[];
} {
  const h = hashString(domain);
  const start = h % MOCK_COMPETITOR_POOL.length;
  const pick = (o: number) =>
    MOCK_COMPETITOR_POOL[(start + o) % MOCK_COMPETITOR_POOL.length];
  return {
    brandName: brandNameFromDomain(domain),
    category: MOCK_CATEGORY_POOL[h % MOCK_CATEGORY_POOL.length],
    competitors: [pick(0), pick(1), pick(3)],
  };
}

// ---------------------------------------------------------------------------
// Methodology note (binding wording — do not reword)
// ---------------------------------------------------------------------------

export function buildMethodologyNote(
  modelIds: string[],
  runsPerPrompt: number,
  measuredAt: number
): string {
  const date = new Date(measuredAt).toISOString().slice(0, 10);
  return (
    `Measured ${date} via provider APIs using ${modelIds.join(", ")}, ` +
    `${runsPerPrompt} run${runsPerPrompt === 1 ? "" : "s"} per prompt. ` +
    `Answers in the ChatGPT/Claude/Perplexity consumer apps can differ due to ` +
    `web search, memory, personalization, location, and model routing. This ` +
    `estimates model behavior; it is not a recording of any real user's session. ` +
    `AI visibility optimization is a young field; evidence for these practices ` +
    `is emerging, not proven.`
  );
}

// ---------------------------------------------------------------------------
// AEO audit (from crawl)
// ---------------------------------------------------------------------------

export function buildAeoAudit(
  crawl: CrawlResult | null
): ReportResult["aeoAudit"] {
  if (!crawl || !crawl.ok) {
    const why = crawl?.error
      ? `Homepage crawl failed: ${crawl.error}.`
      : "Homepage could not be crawled.";
    return [
      { id: "crawl", label: "Homepage reachable by crawlers", pass: false, detail: why },
    ];
  }
  const items: ReportResult["aeoAudit"] = [];
  const titleLen = crawl.title.trim().length;
  items.push({
    id: "title",
    label: "Homepage <title> present and descriptive",
    pass: titleLen >= 10 && titleLen <= 70,
    detail: titleLen
      ? `Title is ${titleLen} characters: "${crawl.title.trim().slice(0, 80)}". Aim for 10–70 characters that state what the product is.`
      : "No <title> found.",
  });
  const descLen = crawl.description.trim().length;
  items.push({
    id: "meta-description",
    label: "Meta description present (50–160 chars)",
    pass: descLen >= 50 && descLen <= 160,
    detail: descLen
      ? `Meta description is ${descLen} characters.`
      : "No meta description found — answer engines often quote it directly.",
  });
  const h1s = crawl.headings.filter((h) => h.level === 1);
  items.push({
    id: "h1",
    label: "Exactly one H1 heading",
    pass: h1s.length === 1,
    detail:
      h1s.length === 1
        ? `H1: "${h1s[0].text.slice(0, 80)}".`
        : `Found ${h1s.length} H1 headings.`,
  });
  items.push({
    id: "org-schema",
    label: "Organization JSON-LD structured data",
    pass: crawl.schemaTypes.includes("Organization"),
    detail: crawl.schemaTypes.length
      ? `Structured data found: ${crawl.schemaTypes.join(", ")}.`
      : "No JSON-LD structured data found on the homepage.",
  });
  items.push({
    id: "faq-schema",
    label: "FAQPage structured data",
    pass: crawl.schemaTypes.includes("FAQPage"),
    detail: crawl.schemaTypes.includes("FAQPage")
      ? "FAQPage JSON-LD detected."
      : "No FAQPage JSON-LD detected — FAQ markup gives answer engines quotable Q&A pairs.",
  });
  const blocked = crawl.robots.aiBots.filter((b) => !b.allowed).map((b) => b.bot);
  items.push({
    id: "ai-crawlers",
    label: "AI crawlers allowed in robots.txt",
    pass: blocked.length === 0,
    detail: blocked.length
      ? `robots.txt blocks: ${blocked.join(", ")}.`
      : "No AI crawlers appear blocked (based on robots.txt prefix rules for the homepage).",
  });
  items.push({
    id: "robots-txt",
    label: "robots.txt reachable",
    pass: crawl.robots.fetched,
    detail: crawl.robots.fetched
      ? "robots.txt fetched successfully."
      : "robots.txt could not be fetched; crawlers fall back to defaults.",
  });
  items.push({
    id: "key-pages",
    label: "Key pages discoverable from navigation",
    pass: crawl.keyPages.length >= 3,
    detail: crawl.keyPages.length
      ? `${crawl.keyPages.length} same-origin nav pages found: ${crawl.keyPages.map((k) => k.label).join(", ")}.`
      : "No same-origin navigation links found.",
  });
  items.push({
    id: "content-depth",
    label: "Readable homepage copy (not JS-only)",
    pass: crawl.textExcerpt.length >= 800,
    detail: `${crawl.textExcerpt.length} characters of server-rendered text extracted. Crawlers that don't execute JavaScript only see this.`,
  });
  return items;
}

// ---------------------------------------------------------------------------
// Fix kit — deterministic artifact builders (mock mode + live-mode base)
// ---------------------------------------------------------------------------

const GROUNDED_LATENCY =
  "Affects search-grounded answers (models that browse or cite the web) — typically days to weeks, after the next crawl of your site.";
const PARAMETRIC_LATENCY =
  "Affects what models learn during training — slow, and not directly controllable.";

function jsonLdScript(obj: unknown): string {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

export function buildDeterministicFixes(args: {
  brandName: string;
  category: string;
  competitors: string[];
  domain: string;
  crawl: CrawlResult | null;
}): FixArtifact[] {
  const { brandName, category, competitors, domain, crawl } = args;
  const homeUrl = `https://${domain}/`;
  const description = crawl?.description?.trim() || "";
  const competitor = competitors[0] ?? `the most popular option in ${category}`;
  const blockedBots =
    crawl?.robots.aiBots.filter((b) => !b.allowed).map((b) => b.bot) ?? [];

  const fixes: FixArtifact[] = [];

  // 1. Organization + WebSite JSON-LD for the homepage
  fixes.push({
    id: "org-jsonld",
    title: "Organization + WebSite JSON-LD for your homepage",
    mechanism: "grounded",
    latencyNote: GROUNDED_LATENCY,
    body: [
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: brandName,
        url: homeUrl,
        description:
          description ||
          `[One factual sentence about what ${brandName} does — no superlatives.]`,
        sameAs: [
          "[https://www.linkedin.com/company/your-company]",
          "[https://x.com/your-handle]",
          "[https://github.com/your-org — if applicable]",
        ],
      }),
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: brandName,
        url: homeUrl,
      }),
    ].join("\n"),
    pasteTarget: "the <head> of your homepage",
    priority: 0,
  });

  // 2. Answer capsule for the homepage
  fixes.push({
    id: "answer-capsule",
    title: "Answer capsule — the first paragraph of your homepage",
    mechanism: "grounded",
    latencyNote: GROUNDED_LATENCY,
    body:
      `${brandName} is one of the ${category} built for [your primary customer — name them plainly]. ` +
      `It [core job in one plain verb phrase]${description ? ` — ${description.slice(0, 120)}` : ""}. ` +
      `[One concrete differentiator, stated factually.] Plans start at [price].\n\n` +
      `— Replace every bracketed part with specifics, keep it 40–60 words, and place it as the first ` +
      `paragraph of visible homepage text. Answer engines quote pages that answer ` +
      `"what is ${brandName} and who is it for?" directly; this capsule is designed to be that quote.`,
    pasteTarget: "top of your homepage, first visible paragraph",
    priority: 0,
  });

  // 3. robots.txt AI-crawler config
  const robotsHeader = blockedBots.length
    ? `# Your current robots.txt blocks: ${blockedBots.join(", ")}.\n# The config below allows the major AI crawlers explicitly.\n\n`
    : `# Explicitly allow the major AI crawlers (they follow default-allow,\n# but explicit groups protect you from broad Disallow rules).\n\n`;
  fixes.push({
    id: "robots-ai",
    title: "robots.txt — AI crawler access",
    mechanism: "grounded",
    latencyNote: GROUNDED_LATENCY,
    body:
      robotsHeader +
      AI_BOTS.map((bot) => `User-agent: ${bot}\nAllow: /`).join("\n\n") +
      `\n\nSitemap: https://${domain}/sitemap.xml`,
    pasteTarget: `https://${domain}/robots.txt`,
    priority: 0,
  });

  // 4. Per-page JSON-LD for key pages
  const keyPages = (crawl?.keyPages ?? []).slice(0, 3);
  if (keyPages.length > 0) {
    const pageType = (label: string, url: string): string => {
      const s = `${label} ${url}`.toLowerCase();
      if (s.includes("about")) return "AboutPage";
      if (s.includes("contact")) return "ContactPage";
      return "WebPage";
    };
    fixes.push({
      id: "key-pages-jsonld",
      title: `Per-page JSON-LD for ${keyPages.length} key page${keyPages.length > 1 ? "s" : ""}`,
      mechanism: "grounded",
      latencyNote: GROUNDED_LATENCY,
      body: keyPages
        .map(
          (p) =>
            `<!-- ${p.label} (${p.url}) -->\n` +
            jsonLdScript({
              "@context": "https://schema.org",
              "@type": pageType(p.label, p.url),
              name: p.label,
              url: p.url,
              description: `[40–60 word answer-style summary of the ${p.label} page.]`,
              isPartOf: { "@type": "WebSite", name: brandName, url: homeUrl },
            })
        )
        .join("\n\n"),
      pasteTarget: "the <head> of each listed page",
      priority: 0,
    });
  }

  // 5. FAQ page draft (+ FAQPage JSON-LD)
  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `What is ${brandName}?`,
      a:
        description ||
        `[Two plain sentences: what ${brandName} does and for whom. No adjectives you can't defend.]`,
    },
    {
      q: `Who is ${brandName} for?`,
      a: `[Name your ideal customer concretely — company size, role, and the problem they arrive with.]`,
    },
    {
      q: `How much does ${brandName} cost?`,
      a: `[State pricing plainly, including the free tier if any. Pages that state prices get cited for pricing questions; vague pages don't.]`,
    },
    {
      q: `How is ${brandName} different from ${competitor}?`,
      a: `[One honest paragraph. Concede what ${competitor} does well; state your difference factually.]`,
    },
    {
      q: `How do I get started with ${brandName}?`,
      a: `[The literal first three steps, with links.]`,
    },
  ];
  fixes.push({
    id: "faq-page",
    title: "FAQ page draft with FAQPage JSON-LD",
    mechanism: "grounded",
    latencyNote: GROUNDED_LATENCY,
    body:
      faqs.map((f) => `## ${f.q}\n\n${f.a}`).join("\n\n") +
      "\n\n---\n\n" +
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    pasteTarget: `new page: https://${domain}/faq`,
    priority: 0,
  });

  // 6. Comparison page outline
  fixes.push({
    id: "comparison-page",
    title: `Comparison page outline: ${brandName} vs ${competitor}`,
    mechanism: "grounded",
    latencyNote: GROUNDED_LATENCY,
    body: [
      `# ${brandName} vs ${competitor}: an honest comparison`,
      ``,
      `## Quick answer (40–60 words)`,
      `[Direct answer: who each product fits best. Answer engines quote this block for "X vs Y" prompts.]`,
      ``,
      `## At a glance`,
      `| | ${brandName} | ${competitor} |`,
      `|---|---|---|`,
      `| Best for | [ICP] | [their ICP] |`,
      `| Pricing | [yours] | [theirs, sourced] |`,
      `| Key strength | [yours] | [theirs — be fair] |`,
      ``,
      `## When ${brandName} is the better fit`,
      `[2–4 specific scenarios.]`,
      ``,
      `## When ${competitor} is the better fit`,
      `[2–3 specific scenarios. Conceding these makes the page citable; one-sided pages read as ads.]`,
      ``,
      `## Switching notes`,
      `[What migrating involves, honestly.]`,
      ``,
      `## FAQ`,
      `[3–5 questions people actually ask about the two, with direct answers + FAQPage JSON-LD.]`,
    ].join("\n"),
    pasteTarget: `new page: https://${domain}/${brandName.toLowerCase().replace(/\s+/g, "-")}-vs-${competitor.toLowerCase().replace(/\s+/g, "-")}`,
    priority: 0,
  });

  // 7. Third-party citations plan (parametric)
  fixes.push({
    id: "citations-plan",
    title: "Third-party citation plan (directories, reviews, communities)",
    mechanism: "parametric",
    latencyNote: PARAMETRIC_LATENCY,
    body: [
      `Models learn brands from widely-crawled third-party sources. This is slow and`,
      `not directly controllable — but it compounds. Work the list top-down:`,
      ``,
      `1. List ${brandName} on G2, Capterra, and AlternativeTo under "${category}"`,
      `   (free listings; keep the category consistent across all three).`,
      `2. Ask 3–5 real customers for reviews on one of those platforms. Never fabricate reviews.`,
      `3. Publish a launch/what-we-do post that answers "what is ${brandName}?" in the first`,
      `   paragraph, somewhere crawlable (your blog, dev.to, an industry newsletter).`,
      `4. Get listed on curated "${category}" roundups — pitch the author a one-line factual blurb.`,
      `5. If you have open-source components or public docs, keep them indexable — they are`,
      `   heavily represented in training corpora.`,
      ``,
      `No third-party placement guarantees model behavior; this list is designed to grow the`,
      `crawlable, citable record of what ${brandName} is.`,
    ].join("\n"),
    pasteTarget: "your marketing backlog",
    priority: 0,
  });

  // Priority: if robots blocks an AI bot, that fix leads; otherwise JSON-LD leads.
  const order = blockedBots.length
    ? ["robots-ai", "org-jsonld", "answer-capsule", "key-pages-jsonld", "faq-page", "comparison-page", "citations-plan"]
    : ["org-jsonld", "answer-capsule", "robots-ai", "key-pages-jsonld", "faq-page", "comparison-page", "citations-plan"];
  fixes.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  fixes.forEach((f, i) => (f.priority = i + 1));
  return fixes;
}

// ---------------------------------------------------------------------------
// Findings + full ReportResult assembly
// ---------------------------------------------------------------------------

const pct = (x: number) => `${Math.round(x * 100)}%`;

function scoreBlock(samples: SampleLite[]): ScoreBlock {
  const mentions = samples.filter((s) => s.brandMentioned).length;
  return {
    samples: samples.length,
    mentions,
    interval: wilsonInterval(mentions, samples.length),
  };
}

/** 2–3 honest teaser findings for the free check. */
export function buildTeaserFindings(args: {
  groundedMentions: number;
  groundedSamples: number;
  groundedModelId: string;
  shareOfVoice: Array<{ name: string; mentions: number; isYou: boolean }>;
  crawl: CrawlResult | null;
}): string[] {
  const { groundedMentions, groundedSamples, groundedModelId, shareOfVoice, crawl } = args;
  const findings: string[] = [];
  findings.push(
    groundedMentions > 0
      ? `Your brand appeared in ${groundedMentions} of ${groundedSamples} search-grounded answers (${groundedModelId}).`
      : `Your brand did not appear in any of the ${groundedSamples} search-grounded answers we sampled (${groundedModelId}).`
  );
  const you = shareOfVoice.find((s) => s.isYou);
  const rival = shareOfVoice
    .filter((s) => !s.isYou)
    .sort((a, b) => b.mentions - a.mentions)[0];
  if (rival && you && rival.mentions > you.mentions) {
    findings.push(
      `${rival.name} was mentioned in ${rival.mentions} answers — more than your brand (${you.mentions}).`
    );
  }
  if (crawl?.ok) {
    const blocked = crawl.robots.aiBots.filter((b) => !b.allowed).map((b) => b.bot);
    if (blocked.length) {
      findings.push(`Your robots.txt blocks ${blocked.join(" and ")} from crawling your site.`);
    } else if (!crawl.schemaTypes.includes("Organization")) {
      findings.push(
        "No Organization JSON-LD found on your homepage — AI crawlers get no structured data about your brand."
      );
    } else if (crawl.description.trim().length < 50) {
      findings.push(
        "Your homepage meta description is missing or very short — answer engines often quote it directly."
      );
    }
  } else if (crawl && !crawl.ok) {
    findings.push(`We could not crawl your homepage (${crawl.error ?? "fetch failed"}).`);
  }
  return findings.slice(0, 3);
}

/**
 * Assemble the full ReportResult (binding shape — Track B renders it blind).
 * Fix artifacts are passed in so live mode can substitute LLM-written copy.
 */
export function buildReportResult(args: {
  samples: SampleLite[];
  models: Array<{ id: string; grounded: boolean }>;
  brandName: string;
  domain: string;
  competitors: string[];
  crawl: CrawlResult | null;
  fixes: FixArtifact[];
  prompts?: PromptSpec[];
  promptSetVersion: string;
  measuredAt: number;
  runsPerPrompt: number;
}): ReportResult {
  const {
    samples, models, brandName, domain, competitors, crawl, fixes,
    prompts, promptSetVersion, measuredAt, runsPerPrompt,
  } = args;

  const modelBlocks = models.map((m) => {
    const ms = samples.filter((s) => s.model === m.id);
    const block = scoreBlock(ms);
    return {
      id: m.id,
      grounded: m.grounded,
      samples: block.samples,
      mentions: block.mentions,
      interval: block.interval,
    };
  });

  const grounded = scoreBlock(samples.filter((s) => s.grounded));
  const ungrounded = scoreBlock(samples.filter((s) => !s.grounded));

  const compCounts = new Map<string, number>();
  for (const c of competitors) compCounts.set(c, 0);
  for (const s of samples) {
    for (const c of s.competitorsMentioned) {
      compCounts.set(c, (compCounts.get(c) ?? 0) + 1);
    }
  }
  const shareOfVoice: ReportResult["shareOfVoice"] = [
    {
      name: brandName,
      mentions: samples.filter((s) => s.brandMentioned).length,
      isYou: true,
    },
    ...Array.from(compCounts.entries())
      .map(([name, mentions]) => ({ name, mentions, isYou: false }))
      .sort((a, b) => b.mentions - a.mentions),
  ];

  // --- Findings (3–6, derived strictly from measured data + crawl) ---
  const findings: string[] = [];
  findings.push(
    grounded.mentions > 0
      ? `Your brand appeared in ${grounded.mentions} of ${grounded.samples} search-grounded answers — ${pct(grounded.interval.point)} (95% interval ${pct(grounded.interval.low)}–${pct(grounded.interval.high)}).`
      : `Your brand did not appear in any of the ${grounded.samples} search-grounded answers sampled.`
  );
  if (grounded.samples > 0 && ungrounded.samples > 0) {
    const gap = grounded.interval.point - ungrounded.interval.point;
    if (Math.abs(gap) >= 0.1) {
      findings.push(
        gap > 0
          ? `Search-grounded models mention you more often than models answering from training knowledge alone (${pct(grounded.interval.point)} vs ${pct(ungrounded.interval.point)}) — your live web presence is doing most of the work.`
          : `Models answering from training knowledge mention you more often than search-grounded ones (${pct(ungrounded.interval.point)} vs ${pct(grounded.interval.point)}) — your current site is likely under-cited by search-grounded engines.`
      );
    }
  }
  const you = shareOfVoice[0];
  const topRival = shareOfVoice.slice(1)[0];
  if (topRival) {
    findings.push(
      topRival.mentions > you.mentions
        ? `${topRival.name} led share of voice: ${topRival.mentions} mentions vs your ${you.mentions} across ${samples.length} sampled answers.`
        : `You led share of voice against the tracked competitors (${you.mentions} mentions vs ${topRival.name}'s ${topRival.mentions}).`
    );
  }
  const groundedSamples = samples.filter((s) => s.grounded);
  const selfCited = groundedSamples.filter((s) =>
    s.citedUrls.some((u) => u.toLowerCase().includes(domain.toLowerCase()))
  ).length;
  if (groundedSamples.length > 0) {
    findings.push(
      selfCited > 0
        ? `${domain} was cited as a source in ${selfCited} of ${groundedSamples.length} search-grounded answers.`
        : `${domain} was never cited as a source in ${groundedSamples.length} search-grounded answers — the fixes below are designed to make your pages easier to cite.`
    );
  }
  if (crawl?.ok) {
    const blocked = crawl.robots.aiBots.filter((b) => !b.allowed).map((b) => b.bot);
    if (blocked.length) {
      findings.push(`Your robots.txt blocks ${blocked.join(", ")} — those crawlers cannot read your site at all.`);
    } else if (!crawl.schemaTypes.includes("Organization")) {
      findings.push("Your homepage has no Organization JSON-LD — crawlers get no structured statement of what your brand is.");
    }
  }
  if (prompts && findings.length < 6) {
    const mentionedPromptIds = new Set(
      samples.filter((s) => s.brandMentioned).map((s) => s.promptId)
    );
    const intents = new Map<string, { total: number; mentioned: number }>();
    for (const p of prompts) {
      const row = intents.get(p.intent) ?? { total: 0, mentioned: 0 };
      row.total += 1;
      if (mentionedPromptIds.has(p.id)) row.mentioned += 1;
      intents.set(p.intent, row);
    }
    const dead = Array.from(intents.entries()).filter(
      ([, r]) => r.total >= 3 && r.mentioned === 0
    );
    if (dead.length) {
      findings.push(
        `You were never mentioned for ${dead.map(([i]) => `"${i}"`).join(", ")} prompts — ${dead.reduce((n, [, r]) => n + r.total, 0)} prompts with zero brand presence.`
      );
    }
  }
  if (findings.length < 3) {
    findings.push("Every sampled answer is in the transcript appendix below — verify any number in this report against it.");
  }

  return {
    promptSetVersion,
    measuredAt,
    models: modelBlocks,
    overall: { grounded, ungrounded },
    shareOfVoice,
    topFindings: findings.slice(0, 6),
    fixes,
    aeoAudit: buildAeoAudit(crawl),
    methodologyNote: buildMethodologyNote(
      models.map((m) => m.id),
      runsPerPrompt,
      measuredAt
    ),
  };
}

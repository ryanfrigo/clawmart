"use node";

/**
 * SSRF-safe homepage crawler (Node runtime — needs dns for resolution checks).
 *
 * Guarantees:
 * - http/https only, no credentials, no localhost/.local/.internal (isSafeUrl)
 * - every hostname (including every redirect hop) is DNS-resolved and every
 *   resulting address must be public (isPrivateIp) BEFORE fetching
 * - 10s timeout per fetch, 500KB response cap, max 5 redirect hops
 * - robots.txt respected for our own UA; AI-bot access reported
 * - text excerpt capped at 20K chars; <=5 same-origin key pages from nav
 *
 * In LLM_MODE=mock this returns a rich deterministic fixture with zero
 * network, so local E2E (and fix-kit generation) works offline.
 */

import dns from "node:dns/promises";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {
  AI_BOTS,
  isPrivateIp,
  isSafeUrl,
  hashString,
  mockBrandProfile,
  type CrawlResult,
} from "./lib/pure";

const USER_AGENT = "ClawmartAuditBot/1.0 (+https://clawmart.co/methodology)";
const PAGE_BYTE_CAP = 500 * 1024;
const ROBOTS_BYTE_CAP = 64 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const TEXT_EXCERPT_CAP = 20_000;
const MAX_KEY_PAGES = 5;

export const crawl = internalAction({
  args: { domain: v.string() },
  handler: async (_ctx, args): Promise<CrawlResult> => {
    if (process.env.LLM_MODE === "mock") return mockCrawl(args.domain);
    return realCrawl(args.domain);
  },
});

// ---------------------------------------------------------------------------
// Real crawl
// ---------------------------------------------------------------------------

function emptyResult(domain: string): CrawlResult {
  return {
    url: `https://${domain}/`,
    fetchedAt: Date.now(),
    ok: false,
    title: "",
    description: "",
    headings: [],
    schemaTypes: [],
    robots: {
      fetched: false,
      aiBots: AI_BOTS.map((bot) => ({ bot, allowed: true })),
    },
    textExcerpt: "",
    keyPages: [],
  };
}

async function realCrawl(domain: string): Promise<CrawlResult> {
  const result = emptyResult(domain);

  // 1. robots.txt (fetch failure is non-fatal — default allow)
  let robotsGroups: RobotsGroup[] = [];
  try {
    const res = await safeFetch(`https://${domain}/robots.txt`, ROBOTS_BYTE_CAP);
    if (res.status === 200 && res.text) {
      robotsGroups = parseRobotsGroups(res.text);
      result.robots.fetched = true;
      result.robots.aiBots = AI_BOTS.map((bot) => ({
        bot,
        allowed: robotsAllows(robotsGroups, bot, "/"),
      }));
    }
  } catch {
    // unreachable robots.txt: leave defaults (fetched=false, all allowed)
  }

  // 2. Respect robots for our own fetch.
  if (result.robots.fetched && !robotsAllows(robotsGroups, "ClawmartAuditBot", "/")) {
    result.error = "blocked_by_robots";
    return result;
  }

  // 3. Homepage
  let html = "";
  try {
    const res = await safeFetch(`https://${domain}/`, PAGE_BYTE_CAP);
    if (res.status >= 400) {
      result.error = `http_${res.status}`;
      return result;
    }
    html = res.text;
    result.url = res.finalUrl;
  } catch (e) {
    result.error = safeErrorMessage(e);
    return result;
  }

  // 4. Parse
  result.ok = true;
  result.title = decodeEntities(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)).trim().slice(0, 300);
  result.description = extractMetaDescription(html).slice(0, 500);
  result.headings = extractHeadings(html);
  result.schemaTypes = extractSchemaTypes(html);
  result.textExcerpt = extractText(html).slice(0, TEXT_EXCERPT_CAP);
  result.keyPages = extractKeyPages(html, result.url, domain);
  return result;
}

function safeErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "fetch_failed";
  // Known-safe internal codes only; never echo raw system errors.
  const known = [
    "unsafe_url",
    "unsafe_ip",
    "dns_failed",
    "timeout",
    "too_many_redirects",
    "redirect_without_location",
  ];
  return known.includes(msg) ? msg : "fetch_failed";
}

// ---------------------------------------------------------------------------
// SSRF-safe fetch (DNS check per hop, manual redirects, byte cap)
// ---------------------------------------------------------------------------

async function assertResolvesPublic(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  // IP literal: isSafeUrl already vetted it.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return;
  let addrs: Array<{ address: string }>;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new Error("dns_failed");
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("unsafe_ip");
  }
}

async function safeFetch(
  url: string,
  maxBytes: number
): Promise<{ status: number; text: string; finalUrl: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isSafeUrl(current)) throw new Error("unsafe_url");
    const u = new URL(current);
    await assertResolvesPublic(u.hostname);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: ac.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,text/plain,*/*;q=0.8",
        },
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        // Drain/cancel the redirect body before moving on.
        try {
          await res.body?.cancel();
        } catch {
          // ignore
        }
        if (!loc) throw new Error("redirect_without_location");
        current = new URL(loc, current).toString();
        continue;
      }
      const text = await readCapped(res, maxBytes);
      return { status: res.status, text, finalUrl: current };
    } catch (e) {
      if (ac.signal.aborted) throw new Error("timeout");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("too_many_redirects");
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) {
    const t = await res.text();
    return t.slice(0, maxBytes);
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }
  const buf = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, buf.byteLength - offset);
    if (take <= 0) break;
    buf.set(c.subarray(0, take), offset);
    offset += take;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

// ---------------------------------------------------------------------------
// robots.txt (minimal prefix-rule parser; wildcards handled crudely)
// ---------------------------------------------------------------------------

type RobotsGroup = {
  agents: string[];
  rules: Array<{ type: "allow" | "disallow"; path: string }>;
};

function parseRobotsGroups(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      lastWasAgent = false;
      if (current) current.rules.push({ type: field, path: value });
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function robotsAllows(groups: RobotsGroup[], bot: string, path: string): boolean {
  if (!groups.length) return true;
  const botL = bot.toLowerCase();
  const specific = groups.find((g) =>
    g.agents.some((a) => a !== "*" && (botL.includes(a) || a.includes(botL)))
  );
  const group = specific ?? groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  // Longest-prefix-match wins; empty Disallow means allow-all.
  let best: { len: number; allow: boolean } | null = null;
  for (const r of group.rules) {
    if (!r.path) continue;
    const prefix = r.path.replace(/\*/g, "").replace(/\$$/, "");
    if (prefix === "" || path.startsWith(prefix)) {
      const len = prefix.length;
      if (!best || len > best.len || (len === best.len && r.type === "allow")) {
        best = { len, allow: r.type === "allow" };
      }
    }
  }
  return best ? best.allow : true;
}

// ---------------------------------------------------------------------------
// HTML extraction (regex-based; no HTML parser dependency)
// ---------------------------------------------------------------------------

function matchFirst(html: string, re: RegExp): string {
  const m = html.match(re);
  return m?.[1] ?? "";
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ");
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    rsquo: "'",
    lsquo: "'",
    rdquo: "”",
    ldquo: "“",
    copy: "©",
    trade: "™",
    reg: "®",
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff
        ? String.fromCodePoint(code)
        : " ";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff
        ? String.fromCodePoint(code)
        : " ";
    })
    .replace(/&([a-z]+);/gi, (m: string, name: string) => named[name.toLowerCase()] ?? m);
}

function extractMetaDescription(html: string): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  let ogFallback = "";
  for (const tag of metaTags) {
    const name = matchFirst(tag, /\bname\s*=\s*["']([^"']*)["']/i).toLowerCase();
    const property = matchFirst(tag, /\bproperty\s*=\s*["']([^"']*)["']/i).toLowerCase();
    const content = matchFirst(tag, /\bcontent\s*=\s*["']([^"']*)["']/i);
    if (name === "description" && content) return decodeEntities(content).trim();
    if (property === "og:description" && content && !ogFallback) {
      ogFallback = decodeEntities(content).trim();
    }
  }
  return ogFallback;
}

function extractHeadings(html: string): Array<{ level: number; text: string }> {
  const out: Array<{ level: number; text: string }> = [];
  const re = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < 40) {
    const text = decodeEntities(stripTags(m[2])).replace(/\s+/g, " ").trim();
    if (text) out.push({ level: Number(m[1]), text: text.slice(0, 200) });
  }
  return out;
}

function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  const re =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      collectTypes(JSON.parse(m[1].trim()), types, 0);
    } catch {
      // malformed JSON-LD — skip block
    }
  }
  return Array.from(types).slice(0, 20);
}

function collectTypes(node: unknown, out: Set<string>, depth: number): void {
  if (depth > 6 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.add(t);
  else if (Array.isArray(t)) {
    for (const x of t) if (typeof x === "string") out.add(x);
  }
  const graph = obj["@graph"];
  if (Array.isArray(graph)) for (const item of graph) collectTypes(item, out, depth + 1);
  const main = obj["mainEntity"];
  if (main) collectTypes(main, out, depth + 1);
}

function extractText(html: string): string {
  const cleaned = html
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return decodeEntities(stripTags(cleaned)).replace(/\s+/g, " ").trim();
}

const KEY_PATH_HINTS = [
  "pricing", "about", "faq", "docs", "features", "product",
  "blog", "how-it-works", "contact", "customers", "use-cases",
];

function extractKeyPages(
  html: string,
  baseUrl: string,
  domain: string
): Array<{ url: string; label: string }> {
  const navBlocks =
    html.match(/<nav\b[\s\S]*?<\/nav>/gi) ??
    html.match(/<header\b[\s\S]*?<\/header>/gi) ??
    [html];
  const seen = new Set<string>();
  const found: Array<{ url: string; label: string; hinted: boolean }> = [];
  const linkRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const block of navBlocks) {
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(block)) !== null) {
      const href = m[1].trim();
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }
      let resolved: URL;
      try {
        resolved = new URL(href, baseUrl);
      } catch {
        continue;
      }
      const host = resolved.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== domain) continue; // same-origin only
      const path = resolved.pathname.replace(/\/+$/, "");
      if (!path || path === "" || seen.has(path)) continue;
      seen.add(path);
      let label = decodeEntities(stripTags(m[2])).replace(/\s+/g, " ").trim().slice(0, 60);
      if (!label) {
        label = path.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") ?? path;
      }
      const hinted = KEY_PATH_HINTS.some((h) => path.toLowerCase().includes(h));
      found.push({
        url: `https://${domain}${path}`,
        label,
        hinted,
      });
    }
    if (found.length >= 25) break;
  }
  found.sort((a, b) => Number(b.hinted) - Number(a.hinted));
  return found.slice(0, MAX_KEY_PAGES).map(({ url, label }) => ({ url, label }));
}

// ---------------------------------------------------------------------------
// Mock crawl (LLM_MODE=mock — deterministic, zero network)
// ---------------------------------------------------------------------------

function mockCrawl(domain: string): CrawlResult {
  const { brandName, category, competitors } = mockBrandProfile(domain);
  const h = hashString(domain);
  const hasOrgSchema = h % 2 === 1;
  const blockPerplexity = h % 3 === 0;
  const hasDescription = h % 4 !== 0;

  const description = hasDescription
    ? `${brandName} helps small teams with ${category}: quick setup, clear reporting, and plain pricing.`
    : "";

  const paragraphs = [
    `${brandName} is built for teams who need ${category} without a six-week onboarding project. ` +
      `Connect your data, invite your team, and get useful output the same afternoon.`,
    `Teams switching from ${competitors[0]} or ${competitors[1]} usually cite two reasons: ` +
      `setup time and pricing clarity. ${brandName} publishes its pricing and its limitations on the same page.`,
    `How it works: sign up, run your first project, and share results with a link. ` +
      `No credit card required for the starter tier. Support answers within one business day.`,
    `${brandName} integrates with the tools most teams already use, and exports everything — ` +
      `there is no lock-in by design. Read the docs for the full API surface.`,
  ];

  return {
    url: `https://${domain}/`,
    fetchedAt: Date.now(),
    ok: true,
    title: `${brandName} — ${category} for small teams`,
    description,
    headings: [
      { level: 1, text: `${category} without the busywork` },
      { level: 2, text: "How it works" },
      { level: 2, text: "Pricing" },
      { level: 2, text: "Frequently asked questions" },
      { level: 3, text: "What customers say" },
    ],
    schemaTypes: hasOrgSchema ? ["Organization", "WebSite"] : ["WebSite"],
    robots: {
      fetched: true,
      aiBots: AI_BOTS.map((bot) => ({
        bot,
        allowed: !(blockPerplexity && bot === "PerplexityBot"),
      })),
    },
    textExcerpt: paragraphs.join(" ").slice(0, TEXT_EXCERPT_CAP),
    keyPages: [
      { url: `https://${domain}/pricing`, label: "Pricing" },
      { url: `https://${domain}/about`, label: "About" },
      { url: `https://${domain}/faq`, label: "FAQ" },
      { url: `https://${domain}/blog`, label: "Blog" },
    ],
  };
}

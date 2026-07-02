import { describe, expect, it } from "vitest";
import {
  checksumToken,
  detectCompetitors,
  detectMention,
  isSafeUrl,
  normalizeDomain,
  tierFor,
  wilsonInterval,
} from "../convex/lib/pure";

// Tests are written against the signatures in docs/BUILD-CONTRACT.md
// ("Pure logic" section). convex/lib/pure.ts is plain TypeScript with no
// Convex imports, so vitest imports it directly.

describe("normalizeDomain", () => {
  it("accepts a bare domain", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
  });

  it("lowercases", () => {
    expect(normalizeDomain("EXAMPLE.COM")).toBe("example.com");
    expect(normalizeDomain("ExAmPlE.cOm")).toBe("example.com");
  });

  it("strips scheme", () => {
    expect(normalizeDomain("https://example.com")).toBe("example.com");
    expect(normalizeDomain("http://example.com")).toBe("example.com");
  });

  it("strips path, query, and fragment", () => {
    expect(normalizeDomain("https://example.com/pricing?utm=x#top")).toBe(
      "example.com"
    );
    expect(normalizeDomain("example.com/about")).toBe("example.com");
  });

  it("strips port", () => {
    expect(normalizeDomain("https://example.com:8443/x")).toBe("example.com");
  });

  it("strips leading www", () => {
    expect(normalizeDomain("www.example.com")).toBe("example.com");
    expect(normalizeDomain("https://www.example.com/")).toBe("example.com");
  });

  it("keeps a non-www subdomain as given", () => {
    expect(normalizeDomain("app.example.com")).toBe("app.example.com");
    expect(normalizeDomain("https://docs.example.co.uk/guide")).toBe(
      "docs.example.co.uk"
    );
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeDomain("  example.com  ")).toBe("example.com");
  });

  it("rejects empty and garbage input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("!!!")).toBeNull();
  });

  it("rejects single-label hosts (no TLD)", () => {
    expect(normalizeDomain("intranet")).toBeNull();
  });

  it("rejects localhost", () => {
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("http://localhost:3000")).toBeNull();
  });

  it("rejects IP literals", () => {
    expect(normalizeDomain("127.0.0.1")).toBeNull();
    expect(normalizeDomain("http://192.168.1.1/admin")).toBeNull();
    expect(normalizeDomain("8.8.8.8")).toBeNull();
    expect(normalizeDomain("http://[::1]/")).toBeNull();
  });

  it("handles IDN domains without crashing (punycode or unicode form)", () => {
    const result = normalizeDomain("https://münchen.de/stadt");
    expect(result).not.toBeNull();
    expect(["xn--mnchen-3ya.de", "münchen.de"]).toContain(result);
  });
});

describe("isSafeUrl", () => {
  it("allows plain http/https public URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com/robots.txt")).toBe(true);
    expect(isSafeUrl("https://sub.example.com/path?q=1")).toBe(true);
  });

  it("rejects non-http(s) schemes", () => {
    expect(isSafeUrl("ftp://example.com/file")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("gopher://example.com")).toBe(false);
  });

  it("rejects unparseable input", () => {
    expect(isSafeUrl("not a url")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });

  it("rejects localhost and loopback", () => {
    expect(isSafeUrl("http://localhost/")).toBe(false);
    expect(isSafeUrl("http://localhost:8080/x")).toBe(false);
    expect(isSafeUrl("http://127.0.0.1/")).toBe(false);
    expect(isSafeUrl("https://127.0.0.53:9/")).toBe(false);
  });

  it("rejects private IPv4 ranges", () => {
    expect(isSafeUrl("http://10.0.0.5/")).toBe(false);
    expect(isSafeUrl("http://10.255.255.255/")).toBe(false);
    expect(isSafeUrl("http://172.16.0.1/")).toBe(false);
    expect(isSafeUrl("http://172.31.255.254/")).toBe(false);
    expect(isSafeUrl("http://192.168.0.1/")).toBe(false);
    expect(isSafeUrl("http://192.168.255.255/admin")).toBe(false);
  });

  it("rejects link-local IPv4 (incl. cloud metadata endpoint)", () => {
    expect(isSafeUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isSafeUrl("http://169.254.0.1/")).toBe(false);
  });

  it("rejects IPv6 loopback, unique-local, and link-local", () => {
    expect(isSafeUrl("http://[::1]/")).toBe(false);
    expect(isSafeUrl("http://[fc00::1]/")).toBe(false);
    expect(isSafeUrl("http://[fe80::1]/")).toBe(false);
  });

  it("rejects .local and .internal hostnames", () => {
    expect(isSafeUrl("http://printer.local/")).toBe(false);
    expect(isSafeUrl("https://db.internal/")).toBe(false);
    expect(isSafeUrl("https://metadata.google.internal/")).toBe(false);
  });
});

describe("detectMention", () => {
  const domain = "acme.com";

  it("matches the brand name on word boundaries", () => {
    expect(detectMention("I recommend Acme for this.", "Acme", domain)).toBe(
      true
    );
    expect(detectMention("Acme is a solid choice", "Acme", domain)).toBe(true);
    expect(detectMention("(try Acme)", "Acme", domain)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(detectMention("ACME leads this category", "Acme", domain)).toBe(
      true
    );
    expect(detectMention("try acme today", "Acme", domain)).toBe(true);
  });

  it("does not match the brand inside a longer word", () => {
    expect(detectMention("Acmeister is unrelated", "Acme", domain)).toBe(
      false
    );
    expect(detectMention("the macme project", "Acme", domain)).toBe(false);
  });

  it("matches space/hyphen variants of multi-word brands", () => {
    const d = "datadoghq.com";
    expect(detectMention("I use data-dog daily", "Data Dog", d)).toBe(true);
    expect(detectMention("I use data dog daily", "Data Dog", d)).toBe(true);
    expect(detectMention("I use DataDog daily", "Data Dog", d)).toBe(true);
    expect(detectMention("Click Up works well", "click-up", "clickup.com")).toBe(
      true
    );
  });

  it("matches a domain mention even without the brand name", () => {
    expect(detectMention("see acme.com for details", "Zzyzx", domain)).toBe(
      true
    );
    expect(
      detectMention("source: https://acme.com/pricing", "Zzyzx", domain)
    ).toBe(true);
    expect(detectMention("via www.acme.com", "Zzyzx", domain)).toBe(true);
  });

  it("returns false when neither brand nor domain appears", () => {
    expect(
      detectMention("Top picks: Foo, Bar, and Baz.", "Acme", domain)
    ).toBe(false);
    expect(detectMention("", "Acme", domain)).toBe(false);
  });
});

describe("detectCompetitors", () => {
  const competitors = ["Ahrefs", "Semrush", "Moz"];

  it("returns only the competitors mentioned", () => {
    const answer = "For SEO I would use Ahrefs, or maybe moz.";
    const found = detectCompetitors(answer, competitors);
    expect([...found].sort()).toEqual(["Ahrefs", "Moz"]);
  });

  it("does not match competitor names inside longer words", () => {
    const found = detectCompetitors("Mozart wrote music", competitors);
    expect(found).not.toContain("Moz");
  });

  it("returns an empty array when nothing matches", () => {
    expect(detectCompetitors("no tools mentioned here", competitors)).toEqual(
      []
    );
    expect(detectCompetitors("anything", [])).toEqual([]);
  });
});

describe("wilsonInterval", () => {
  // Reference values: Wilson score interval, z = 1.96 (95%).

  it("0/10 → [0, 0.2775]", () => {
    const { low, high, point } = wilsonInterval(0, 10);
    expect(point).toBeCloseTo(0, 5);
    expect(low).toBeCloseTo(0, 4);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeCloseTo(0.2775, 3);
  });

  it("10/10 → [0.7225, 1]", () => {
    const { low, high, point } = wilsonInterval(10, 10);
    expect(point).toBeCloseTo(1, 5);
    expect(low).toBeCloseTo(0.7225, 3);
    expect(high).toBeCloseTo(1, 4);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("3/9 → [0.1206, 0.6458]", () => {
    const { low, high, point } = wilsonInterval(3, 9);
    expect(point).toBeCloseTo(1 / 3, 5);
    expect(low).toBeCloseTo(0.1206, 3);
    expect(high).toBeCloseTo(0.6458, 3);
  });

  it("5/10 → [0.2366, 0.7634]", () => {
    const { low, high, point } = wilsonInterval(5, 10);
    expect(point).toBeCloseTo(0.5, 5);
    expect(low).toBeCloseTo(0.2366, 3);
    expect(high).toBeCloseTo(0.7634, 3);
  });

  it("is safe for n = 0 (no NaN, stays in [0, 1])", () => {
    const { low, high, point } = wilsonInterval(0, 0);
    expect(Number.isFinite(low)).toBe(true);
    expect(Number.isFinite(high)).toBe(true);
    expect(Number.isFinite(point)).toBe(true);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
    expect(low).toBeLessThanOrEqual(high);
  });

  it("always brackets the point estimate within [0, 1]", () => {
    for (const [s, n] of [
      [1, 3],
      [7, 40],
      [39, 40],
      [120, 360],
    ] as const) {
      const { low, high, point } = wilsonInterval(s, n);
      expect(low).toBeGreaterThanOrEqual(0);
      expect(high).toBeLessThanOrEqual(1);
      expect(low).toBeLessThanOrEqual(point);
      expect(point).toBeLessThanOrEqual(high);
    }
  });
});

describe("tierFor", () => {
  // Contract: 0 mentions → invisible; <20% → faint; 20-60% → mixed; >60% → visible.

  it("0 mentions is invisible regardless of rate math", () => {
    expect(tierFor(0, 20)).toBe("invisible");
    expect(tierFor(0, 1)).toBe("invisible");
    expect(tierFor(0, 0)).toBe("invisible");
  });

  it("below 20% is faint", () => {
    expect(tierFor(1, 20)).toBe("faint"); // 5%
    expect(tierFor(19, 100)).toBe("faint"); // 19%
  });

  it("20% through 60% is mixed", () => {
    expect(tierFor(20, 100)).toBe("mixed"); // exactly 20%
    expect(tierFor(2, 10)).toBe("mixed"); // 20%
    expect(tierFor(40, 100)).toBe("mixed");
    expect(tierFor(60, 100)).toBe("mixed"); // exactly 60%
  });

  it("above 60% is visible", () => {
    expect(tierFor(61, 100)).toBe("visible");
    expect(tierFor(7, 10)).toBe("visible"); // 70%
    expect(tierFor(10, 10)).toBe("visible");
  });
});

describe("checksumToken", () => {
  it("returns 32 lowercase hex characters (128 bits)", () => {
    const token = checksumToken();
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is unique across many generations", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => checksumToken()));
    expect(tokens.size).toBe(200);
  });
});

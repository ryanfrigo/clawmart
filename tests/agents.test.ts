import { describe, expect, it } from "vitest";
import {
  AGENTS,
  FALLBACK_IDEAS,
  PIPELINE,
  ceoCheckinMessages,
  escapeHtml,
  extractJson,
  slugify,
  slugSuffix,
  surpriseIdeaMessages,
} from "../convex/lib/agents";

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("ignores prose around the object", () => {
    expect(extractJson('Sure! Here it is:\n{"a": {"b": 2}}\nHope that helps.')).toEqual({
      a: { b: 2 },
    });
  });

  it("keeps nested braces intact", () => {
    const out = extractJson('{"hero": {"headline": "x"}, "faq": [{"q": "a}b"}]}');
    expect(out.hero).toEqual({ headline: "x" });
  });

  it("throws on non-object output", () => {
    expect(() => extractJson("[1,2]")).toThrow();
    expect(() => extractJson("no json here")).toThrow();
    expect(() => extractJson('"just a string"')).toThrow();
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Acme Labs!")).toBe("acme-labs");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("  --Weird__Name--  ")).toBe("weird-name");
  });

  it("falls back for degenerate input", () => {
    expect(slugify("!!!")).toBe("company");
  });

  it("caps length", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(48);
  });
});

describe("slugSuffix", () => {
  it("returns 3 base36 chars", () => {
    expect(slugSuffix()).toMatch(/^[a-z0-9]{3}$/);
  });
});

describe("surprise me", () => {
  it("prompt demands a single JSON object with an idea", () => {
    const messages = surpriseIdeaMessages();
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain('{"idea"');
    expect(messages[0].content).toContain("ONLY a JSON object");
  });

  it("fallback pool entries all pass the create-form constraints", () => {
    expect(FALLBACK_IDEAS.length).toBeGreaterThanOrEqual(5);
    for (const idea of FALLBACK_IDEAS) {
      expect(idea.trim().length).toBeGreaterThanOrEqual(20); // IDEA_MIN
      expect(idea.length).toBeLessThanOrEqual(500);
    }
  });
});

describe("escapeHtml", () => {
  it("neutralizes markup from model/user strings", () => {
    expect(escapeHtml(`<a href="https://evil.example">Verify</a> & 'more'`)).toBe(
      "&lt;a href=&quot;https://evil.example&quot;&gt;Verify&lt;/a&gt; &amp; &#39;more&#39;"
    );
  });
  it("passes plain text through", () => {
    expect(escapeHtml("BakeCost got 3 signups.")).toBe("BakeCost got 3 signups.");
  });
});

describe("ceo check-in", () => {
  it("prompt forbids invented metrics and demands the JSON contract", () => {
    const messages = ceoCheckinMessages({
      name: "Acme",
      positioning: "Widgets for welders",
      totalSignups: 12,
      newSignups: 3,
    });
    expect(messages[0].content).toContain("ONLY the numbers provided");
    expect(messages[0].content).toContain('{"focus"');
    expect(messages[1].content).toContain("12 total signups, 3 in the last 24h");
  });
});

describe("agent definitions", () => {
  it("covers every pipeline step", () => {
    for (const key of PIPELINE) {
      expect(AGENTS[key]).toBeDefined();
      expect(AGENTS[key].maxTokens).toBeGreaterThan(0);
    }
  });

  it("every prompt forbids fabricated social proof and demands JSON", () => {
    for (const key of PIPELINE) {
      const messages = AGENTS[key].buildMessages("test idea", {});
      const system = messages[0].content;
      expect(system).toContain("Never invent testimonials");
      expect(system).toContain("valid JSON");
    }
  });

  it("later agents receive earlier assets", () => {
    const messages = AGENTS.landing.buildMessages("idea", {
      strategist: '{"positioning":"p"}',
      brand: '{"name":"Acme"}',
      product: '{"summary":"s"}',
    });
    const user = messages[1].content;
    expect(user).toContain("STRATEGIST");
    expect(user).toContain("BRAND");
    expect(user).toContain("PRODUCT");
  });
});

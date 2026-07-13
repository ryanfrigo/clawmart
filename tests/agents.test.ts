import { describe, expect, it } from "vitest";
import {
  AGENTS,
  PIPELINE,
  extractJson,
  slugify,
  slugSuffix,
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

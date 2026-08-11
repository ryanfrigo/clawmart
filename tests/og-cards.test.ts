import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Social cards are the most-shared artifact this product produces, and a
 * generated company card shows a name and tagline that read exactly like a
 * real company. CLAUDE.md's trust rules bind every generated asset, not just
 * pages — so the AI-draft disclosure has to be ON the image.
 *
 * These read source rather than pixels. Satori rendering is verified by the
 * build (both routes prerender) and by eye; what source can guarantee is that
 * nobody quietly deletes the label during a redesign, which is the actual
 * regression worth catching.
 */

const root = join(process.cwd(), "src/app/opengraph-image.tsx");
const company = join(process.cwd(), "src/app/c/[slug]/opengraph-image.tsx");
const read = (p: string) => readFileSync(p, "utf8");

// Matches rendered copy, not a comment about it: comments are stripped first,
// so a card whose only "AI draft" mention is a code comment fails.
const withoutComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("social cards carry the AI-draft disclosure", () => {
  it("the company card labels the concept as an AI draft", () => {
    const src = withoutComments(read(company));
    expect(src).toMatch(/AI draft/i);
    expect(src).toMatch(/not a real company/i);
  });

  it("the site card says outputs are AI drafts", () => {
    const src = withoutComments(read(root));
    expect(src).toMatch(/AI draft/i);
  });

  it("neither card claims traction, ratings, or user counts", () => {
    for (const p of [root, company]) {
      const src = withoutComments(read(p));
      // The specific fabrications the trust rules name.
      expect(src).not.toMatch(/\b\d[\d,]*\+?\s*(users|customers|founders)\b/i);
      expect(src).not.toMatch(/\b\d(\.\d)?\s*(\/\s*5|stars?)\b/i);
      expect(src).not.toMatch(/guaranteed/i);
      expect(src).not.toMatch(/trusted by/i);
    }
  });
});

describe("the site card is a valid large-summary image", () => {
  it("declares the 1200x630 PNG that twitter:card summary_large_image needs", () => {
    const src = read(root);
    expect(src).toContain("width: 1200");
    expect(src).toContain("height: 630");
    expect(src).toContain('contentType = "image/png"');
  });

  it("has alt text, since the card is content and not decoration", () => {
    expect(read(root)).toMatch(/export const alt =/);
  });
});

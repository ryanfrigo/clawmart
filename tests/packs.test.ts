import { describe, expect, it } from "vitest";
import {
  BUNDLE,
  PACKS,
  getPack,
  isBundle,
  priceForSlug,
  titleForSlug,
} from "../src/lib/packs";

// The checkout route trusts src/lib/packs.ts as the single source of truth for
// price + title: the client only sends `slug`, and the route sends
// priceForSlug(slug) as the charged amount. These tests pin that contract so a
// tampered client can never change the price, and Convex's amountUsd ∈ {39, 99}
// guard can never reject a legitimately-priced slug.

const ALLOWED_AMOUNTS = new Set([39, 99]);

describe("priceForSlug / titleForSlug — slug validation", () => {
  it("resolves every catalog pack to its price and title", () => {
    for (const pack of PACKS) {
      expect(priceForSlug(pack.slug)).toBe(pack.priceUsd);
      expect(titleForSlug(pack.slug)).toBe(pack.title);
    }
  });

  it("resolves the All-Access bundle", () => {
    expect(priceForSlug(BUNDLE.slug)).toBe(BUNDLE.priceUsd);
    expect(titleForSlug(BUNDLE.slug)).toBe(BUNDLE.title);
  });

  it("returns null for unknown / empty / whitespace slugs", () => {
    for (const bad of ["", "   ", "nope", "AI-SDR", "all_access", "packs"]) {
      expect(priceForSlug(bad)).toBeNull();
      expect(titleForSlug(bad)).toBeNull();
    }
  });
});

describe("amount-tampering guard invariant", () => {
  it("every resolvable price is in the allowed set {39, 99}", () => {
    for (const slug of [...PACKS.map((p) => p.slug), BUNDLE.slug]) {
      const price = priceForSlug(slug);
      expect(price).not.toBeNull();
      expect(ALLOWED_AMOUNTS.has(price as number)).toBe(true);
    }
  });

  it("packs are $39 and the bundle is $99 (the two allowed amounts)", () => {
    for (const pack of PACKS) expect(pack.priceUsd).toBe(39);
    expect(BUNDLE.priceUsd).toBe(99);
  });
});

describe("getPack / isBundle", () => {
  it("getPack returns the pack for a known slug, undefined otherwise", () => {
    expect(getPack(PACKS[0].slug)?.slug).toBe(PACKS[0].slug);
    expect(getPack("does-not-exist")).toBeUndefined();
    expect(getPack(BUNDLE.slug)).toBeUndefined(); // the bundle is not a pack
  });

  it("isBundle is true only for the bundle slug", () => {
    expect(isBundle(BUNDLE.slug)).toBe(true);
    for (const pack of PACKS) expect(isBundle(pack.slug)).toBe(false);
    expect(isBundle("all_access")).toBe(false);
  });
});

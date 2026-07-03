import { describe, expect, it } from "vitest";
import { ipFromHeaders, ipHash } from "../src/lib/request-ip";

describe("ipHash — determinism", () => {
  const secret = "shared-secret-abc";

  it("is stable for the same (ip, secret) pair", () => {
    expect(ipHash("203.0.113.7", secret)).toBe(ipHash("203.0.113.7", secret));
  });

  it("changes when the ip changes", () => {
    expect(ipHash("203.0.113.7", secret)).not.toBe(
      ipHash("203.0.113.8", secret)
    );
  });

  it("changes when the secret changes (salted)", () => {
    expect(ipHash("203.0.113.7", secret)).not.toBe(
      ipHash("203.0.113.7", "different-secret")
    );
  });

  it("returns a 64-char lowercase hex digest (sha256)", () => {
    expect(ipHash("203.0.113.7", secret)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("ipFromHeaders", () => {
  const h = (xff?: string) =>
    new Headers(xff === undefined ? {} : { "x-forwarded-for": xff });

  it("takes the first hop of x-forwarded-for", () => {
    expect(ipFromHeaders(h("198.51.100.5, 10.0.0.1, 10.0.0.2"))).toBe(
      "198.51.100.5"
    );
  });

  it("trims surrounding whitespace", () => {
    expect(ipFromHeaders(h("  198.51.100.5  "))).toBe("198.51.100.5");
  });

  it("falls back to 'unknown' when the header is missing or empty", () => {
    expect(ipFromHeaders(h())).toBe("unknown");
    expect(ipFromHeaders(h(""))).toBe("unknown");
    expect(ipFromHeaders(h("   "))).toBe("unknown");
  });
});

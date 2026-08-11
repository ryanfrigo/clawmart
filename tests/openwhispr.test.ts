import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeError,
  describeFailure,
  fetchNotes,
  isValidKeyShape,
  maskKey,
  parseNote,
  parseNotePage,
} from "../src/lib/openwhispr";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("key handling", () => {
  it("accepts both documented key shapes and rejects look-alikes", () => {
    expect(isValidKeyShape("owk_live_abcdefgh1234")).toBe(true);
    expect(isValidKeyShape("  ow_wks_live_abcdefgh1234  ")).toBe(true);
    // A test-mode or truncated key would fail server-side anyway; catching it
    // here saves a round trip and a confusing 401.
    expect(isValidKeyShape("owk_test_abcdefgh1234")).toBe(false);
    expect(isValidKeyShape("owk_live_short")).toBe(false);
    expect(isValidKeyShape("sk-or-v1-somethingelse")).toBe(false);
    expect(isValidKeyShape("")).toBe(false);
  });

  it("never renders the middle of a key", () => {
    const key = "owk_live_SECRETMIDDLE9999";
    const masked = maskKey(key);
    expect(masked).not.toContain("SECRETMIDDLE");
    expect(masked.startsWith("owk_live")).toBe(true);
    expect(masked.endsWith("9999")).toBe(true);
    // A short string must not leak by falling through unmasked.
    expect(maskKey("owk_live_ab")).toBe("•".repeat(11));
  });
});

describe("parseNote", () => {
  it("reads the obvious field aliases, since the docs don't fix row shape", () => {
    for (const row of [
      { id: "n1", text: "Bike mechanic quoting tool" },
      { note_id: "n1", content: "Bike mechanic quoting tool" },
      { uuid: "n1", body: "Bike mechanic quoting tool" },
      { id: "n1", transcript: "Bike mechanic quoting tool" },
    ]) {
      expect(parseNote(row)?.text).toBe("Bike mechanic quoting tool");
    }
  });

  it("drops rows with no id or no usable text rather than showing a blank option", () => {
    expect(parseNote({ id: "n1", text: "   " })).toBeNull();
    expect(parseNote({ text: "no id here" })).toBeNull();
    expect(parseNote(null)).toBeNull();
    expect(parseNote("nope")).toBeNull();
  });

  it("titles an untitled note from its opening words", () => {
    const note = parseNote({ id: "n1", text: "A tool for independent bike mechanics" });
    expect(note?.title).toBe("A tool for independent bike mechanics");
  });

  it("normalizes timestamps to epoch ms and tolerates missing or junk ones", () => {
    expect(parseNote({ id: "n", text: "t", created_at: 1754769600000 })?.createdAt).toBe(
      1754769600000
    );
    expect(parseNote({ id: "n", text: "t", created_at: "2026-08-10T00:00:00Z" })?.createdAt).toBe(
      Date.parse("2026-08-10T00:00:00Z")
    );
    expect(parseNote({ id: "n", text: "t", created_at: "not a date" })?.createdAt).toBeNull();
    expect(parseNote({ id: "n", text: "t" })?.createdAt).toBeNull();
  });
});

describe("parseNotePage", () => {
  it("reads the documented envelope and passes the cursor back opaquely", () => {
    const page = parseNotePage({
      data: [{ id: "a", text: "one" }, { id: "b", text: "two" }],
      has_more: true,
      next_cursor: "OPAQUE::TOKEN==",
    });
    expect(page.notes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(page.nextCursor).toBe("OPAQUE::TOKEN==");
  });

  it("stops paginating when has_more is false, even if a cursor is present", () => {
    // Following a stale cursor past the end is how a list loops forever.
    expect(
      parseNotePage({ data: [], has_more: false, next_cursor: "stale" }).nextCursor
    ).toBeNull();
  });

  it("survives a shape it did not expect", () => {
    expect(parseNotePage(null)).toEqual({ notes: [], nextCursor: null });
    expect(parseNotePage({ data: "not an array" })).toEqual({ notes: [], nextCursor: null });
  });
});

describe("error messages tell the user what to actually do", () => {
  it("names the fix for a bad key and does not blame the network", () => {
    const msg = describeError(401, { error: { code: "unauthorized", message: "nope" } });
    expect(msg).toMatch(/Integrations → API/);
    expect(msg).not.toMatch(/network/i);
  });

  it("distinguishes rate limiting and upstream failure from a bad key", () => {
    expect(describeError(429, null)).toMatch(/rate-limit/i);
    expect(describeError(503, null)).toMatch(/trouble/i);
    // A rate-limited key is a working key: the message must not send the user
    // off to regenerate one, which is what the 401 copy tells them to do.
    expect(describeError(429, null)).not.toMatch(/Integrations → API/);
    expect(describeError(503, null)).not.toMatch(/Integrations → API/);
  });

  it("explains a blocked browser request instead of saying 'network error'", () => {
    // The browser hides CORS from script, so a generic message would send the
    // user off to regenerate a key that was never the problem.
    expect(describeFailure()).toMatch(/browser/i);
    expect(describeFailure()).toMatch(/paste/i);
  });
});

describe("fetchNotes", () => {
  it("calls the documented endpoint with bearer auth and the cursor", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: "a", text: "hi" }], has_more: false }), {
          status: 200,
        })
      );
    });

    const page = await fetchNotes("owk_live_abcdefgh1234", { cursor: "C1", limit: 5 });
    expect(page.notes).toHaveLength(1);

    const [url, init] = calls[0];
    expect(url).toContain("https://api.openwhispr.com/api/v1/notes/list");
    expect(url).toContain("limit=5");
    expect(url).toContain("cursor=C1");
    expect((init?.headers as Record<string, string>).authorization).toBe(
      "Bearer owk_live_abcdefgh1234"
    );
  });

  it("throws a displayable message on an API error, not a raw status", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { code: "unauthorized" } }), { status: 401 })
      )
    );
    await expect(fetchNotes("owk_live_abcdefgh1234")).rejects.toThrow(/Integrations → API/);
  });

  it("turns a blocked/failed request into the CORS explanation", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    await expect(fetchNotes("owk_live_abcdefgh1234")).rejects.toThrow(/browser/i);
  });
});

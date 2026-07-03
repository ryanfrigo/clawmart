import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildZip, collectDownloadFiles, type PackFile } from "../src/lib/zip";

// A tiny in-memory pack-file map so these tests stay independent of the
// generated src/lib/pack-contents.ts (which doesn't exist until packs are
// compiled). Mirrors the real shape: slug → [{ path, content }].
const FIXTURE: Record<string, PackFile[]> = {
  "ai-sdr": [
    { path: "README.md", content: "# AI SDR Pack\n" },
    { path: "cold-open/SKILL.md", content: "---\nname: cold-open\n---\n" },
  ],
  "ecom-ops": [{ path: "README.md", content: "# E-Commerce Ops Pack\n" }],
};
const PACK_SLUGS = ["ai-sdr", "ecom-ops"];
const BUNDLE_SLUG = "all-access";

describe("collectDownloadFiles", () => {
  it("returns a single pack's files with paths unchanged", () => {
    const files = collectDownloadFiles(
      "ai-sdr",
      FIXTURE,
      BUNDLE_SLUG,
      PACK_SLUGS
    );
    expect(files.map((f) => f.path).sort()).toEqual([
      "README.md",
      "cold-open/SKILL.md",
    ]);
  });

  it("returns [] for an unknown / uncompiled slug", () => {
    expect(
      collectDownloadFiles("does-not-exist", FIXTURE, BUNDLE_SLUG, PACK_SLUGS)
    ).toEqual([]);
  });

  it("expands the bundle to every pack, prefixing each path with its slug", () => {
    const files = collectDownloadFiles(
      BUNDLE_SLUG,
      FIXTURE,
      BUNDLE_SLUG,
      PACK_SLUGS
    );
    expect(files.map((f) => f.path).sort()).toEqual([
      "ai-sdr/README.md",
      "ai-sdr/cold-open/SKILL.md",
      "ecom-ops/README.md",
    ]);
  });
});

describe("buildZip", () => {
  it("produces a zip containing the expected paths and contents", async () => {
    const files = collectDownloadFiles(
      "ai-sdr",
      FIXTURE,
      BUNDLE_SLUG,
      PACK_SLUGS
    );
    const bytes = await buildZip(files);
    expect(bytes.byteLength).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(bytes);
    // JSZip synthesizes a folder entry ("cold-open/") for nested files; compare
    // only the actual file entries.
    const filePaths = Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => f.name)
      .sort();
    expect(filePaths).toEqual(["README.md", "cold-open/SKILL.md"]);
    expect(await zip.file("README.md")!.async("string")).toBe("# AI SDR Pack\n");
    expect(await zip.file("cold-open/SKILL.md")!.async("string")).toBe(
      "---\nname: cold-open\n---\n"
    );
  });

  it("zips a bundle with slug-prefixed folders", async () => {
    const files = collectDownloadFiles(
      BUNDLE_SLUG,
      FIXTURE,
      BUNDLE_SLUG,
      PACK_SLUGS
    );
    const zip = await JSZip.loadAsync(await buildZip(files));
    expect(Object.keys(zip.files)).toContain("ai-sdr/cold-open/SKILL.md");
    expect(Object.keys(zip.files)).toContain("ecom-ops/README.md");
  });
});

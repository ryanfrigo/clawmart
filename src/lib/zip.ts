import JSZip from "jszip";

export type PackFile = { path: string; content: string };

/**
 * Resolve the files that belong in the gated download for `slug`:
 *
 * - a pack slug → that pack's files, paths unchanged.
 * - the bundle slug → every pack's files, each path prefixed with
 *   `<packSlug>/` so the archive is organized one folder per pack.
 *
 * Unknown slugs (or packs with no compiled content yet) resolve to `[]`.
 *
 * Pure and fixture-friendly: the pack-file map and the list of pack slugs are
 * passed in rather than imported, so this is testable without the generated
 * `pack-contents.ts`.
 */
export function collectDownloadFiles(
  slug: string,
  packFiles: Record<string, PackFile[]>,
  bundleSlug: string,
  packSlugs: string[]
): PackFile[] {
  if (slug === bundleSlug) {
    const files: PackFile[] = [];
    for (const packSlug of packSlugs) {
      for (const file of packFiles[packSlug] ?? []) {
        files.push({ path: `${packSlug}/${file.path}`, content: file.content });
      }
    }
    return files;
  }
  return packFiles[slug] ?? [];
}

/** Build a zip archive from a flat list of files. Returns an ArrayBuffer,
 *  which is a valid response BodyInit (avoids the Uint8Array<ArrayBufferLike>
 *  vs ArrayBuffer strictness in Next's route handlers). */
export async function buildZip(files: PackFile[]): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

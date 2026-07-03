import { NextResponse } from "next/server";
import { FREE_SKILLS } from "@/lib/free-skills";
import { PACK_FILES } from "@/lib/pack-contents";
import { buildZip, type PackFile } from "@/lib/zip";

/**
 * GET /api/free-download — the free lead-magnet zip (3 sample skills).
 *
 * Ungated on purpose: these skills are given away to demonstrate quality and
 * funnel to the paid packs. We assemble each free skill's SKILL.md from the
 * compiled pack contents, plus a short README that points to the full packs.
 */
export async function GET() {
  const files: PackFile[] = [];

  for (const free of FREE_SKILLS) {
    const packFiles = PACK_FILES[free.packSlug] ?? [];
    const skillFile = packFiles.find(
      (f) => f.path === `${free.name}/SKILL.md`
    );
    if (skillFile) {
      files.push({ path: `${free.name}/SKILL.md`, content: skillFile.content });
    }
  }

  files.push({
    path: "README.md",
    content: [
      "# Clawmart — Free OpenClaw Skills",
      "",
      "Three free, standalone skills for OpenClaw (github.com/openclaw/openclaw).",
      "",
      "## Install",
      "",
      "Copy each skill folder into `~/.openclaw/skills` (or your workspace's",
      "`skills/` directory), then start a new OpenClaw session so it picks them up.",
      "",
      "## What's inside",
      "",
      ...FREE_SKILLS.map((s) => `- **${s.title}** — ${s.summary}`),
      "",
      "## Want the rest?",
      "",
      "Each of these is one skill from a full pack. The complete packs bundle the",
      "skills that work together for a whole job (outbound sales, store ops, a",
      "personal chief of staff, a content engine), with a setup guide — at",
      "https://clawmart.co/packs",
      "",
      "Clawmart is an independent storefront and is not affiliated with or",
      "endorsed by OpenClaw.",
      "",
    ].join("\n"),
  });

  const zip = await buildZip(files);

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="clawmart-free-skills.zip"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

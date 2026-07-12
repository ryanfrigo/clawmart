import type { Metadata } from "next";
import Link from "next/link";
import { Download, ArrowRight, Check } from "lucide-react";
import { FREE_SKILLS } from "@/lib/free-skills";
import { getPack } from "@/lib/packs";
import { WaitlistForm } from "@/components/home/waitlist-form";
import { Button } from "@/components/ui/button";
import { SKILLS_PATH, CLAWHUB_LINE } from "@/components/site/constants";

export const metadata: Metadata = {
  title: "Free OpenClaw skills — 3 to try · Clawmart",
  description:
    "Three free, genuinely useful skills for OpenClaw: prospect research, meeting prep, and transcript cleanup. Download the zip, drop into ~/.openclaw/skills, done. No signup.",
  alternates: { canonical: "https://clawmart.co/free" },
};

const ANSWER_CAPSULE =
  "Clawmart gives away three real OpenClaw skills — prospect research, meeting prep, and transcript cleanup — as a free zip. Each is one skill from a paid pack. Download it, copy the folders into ~/.openclaw/skills, start a new session, and the skills are live. No signup required.";

export default function FreePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Clawmart Free OpenClaw Skills",
    description: ANSWER_CAPSULE,
    offers: { "@type": "Offer", price: "0.00", priceCurrency: "USD", url: "https://clawmart.co/free" },
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
        Free · no signup
      </p>
      <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.05] tracking-tight">
        Three free skills for your OpenClaw.
      </h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
        Real, standalone skills you can use today — no strings, no account.
        Each is one skill from a full pack, so you can see the quality before
        you buy anything.
      </p>

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg" className="font-medium">
          <a href="/api/free-download" download>
            <Download className="size-4" />
            Download the free skills (.zip)
          </a>
        </Button>
        <span className="font-mono text-[12.5px] text-muted-foreground">
          3 skills · drop into{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground/90">
            {SKILLS_PATH}
          </code>
        </span>
      </div>

      {/* what's inside */}
      <div className="mt-14 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">What&apos;s inside</h2>
        <ul className="space-y-4">
          {FREE_SKILLS.map((s) => {
            const pack = getPack(s.packSlug);
            return (
              <li
                key={s.name}
                className="rounded-2xl border border-border/60 bg-card/40 p-5"
              >
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-lobster" />
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-foreground">{s.title}</span>
                      <code className="font-mono text-[12px] text-muted-foreground">
                        {s.name}
                      </code>
                    </div>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">
                      {s.summary}
                    </p>
                    {pack && (
                      <Link
                        href={`/packs/${pack.slug}`}
                        className="mt-2 inline-flex items-center gap-1 text-[13.5px] text-lobster underline-offset-2 hover:underline"
                      >
                        Get the full {pack.title} <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* install */}
      <div className="mt-14">
        <h2 className="font-display text-2xl tracking-tight">How to install</h2>
        <ol className="mt-5 space-y-3">
          {[
            ["01", "Download & unzip", "Grab the zip above and unzip it — you'll get one folder per skill."],
            ["02", `Copy into ${SKILLS_PATH}`, "Move the skill folders into your OpenClaw skills directory (or your workspace's skills/ folder)."],
            ["03", "Start a new session", "OpenClaw loads the new skills on the next session. Try a trigger phrase from each skill's SKILL.md."],
          ].map(([n, title, body]) => (
            <li key={n} className="flex gap-4 rounded-xl border border-border/50 bg-card/30 p-4">
              <span className="font-mono text-[13px] text-lobster">{n}</span>
              <div>
                <div className="font-medium text-foreground">{title}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* honest note + upsell */}
      <div className="mt-14 rounded-2xl border border-lobster/25 bg-lobster/[0.04] p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">
          Like these? The full packs do the whole job.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {CLAWHUB_LINE} Each free skill above is one piece of a pack — the paid
          packs bundle the six skills that work together for a whole job
          (outbound sales, store ops, a personal chief of staff, a content
          engine), with a setup guide.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild size="lg" className="font-medium">
            <Link href="/packs">
              Browse the packs <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* waitlist */}
      <div className="mt-14">
        <h2 className="font-display text-2xl tracking-tight">
          Want new free skills as they drop?
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Leave an email and we&apos;ll send new free skills and packs. No spam.
        </p>
        <div className="mt-4 max-w-md">
          <WaitlistForm source="packs" />
        </div>
      </div>
    </div>
  );
}

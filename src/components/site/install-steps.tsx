import { SKILLS_PATH } from "@/components/site/constants";

const STEPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Buy the pack",
    body: "Guest checkout via Stripe — no account. Your card is charged once; the pack is yours.",
  },
  {
    n: "02",
    title: "Download the zip",
    body: "You land on a private download page with a permanent link. Bookmark it — it's your receipt and re-download.",
  },
  {
    n: "03",
    title: "Drop it into your skills folder",
    body: `Unzip and copy the skill folders into ${SKILLS_PATH} (or your workspace's skills/ directory).`,
  },
  {
    n: "04",
    title: "Start a new OpenClaw session",
    body: "OpenClaw loads the new skills on the next session. Trigger them with the phrases in each pack's README.",
  },
];

/**
 * The buy → download → install → new-session flow. Honest and concrete:
 * these are skill folders you copy in, not a background service.
 */
export function InstallSteps({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2"
          : "grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4"
      }
    >
      {STEPS.map((s) => (
        <div key={s.n} className="bg-background p-6">
          <span className="font-mono text-[12px] text-lobster">{s.n}</span>
          <h3 className="mt-3 text-[14.5px] font-semibold tracking-tight">
            {s.title}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {s.body}
          </p>
        </div>
      ))}
    </div>
  );
}

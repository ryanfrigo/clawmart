import type { Metadata } from "next";
import { Compass, Palette, Boxes, LayoutTemplate, Megaphone } from "lucide-react";
import { StudioLauncher } from "@/components/studio/studio-launcher";

export const metadata: Metadata = {
  title: "Studio — describe a company, watch AI agents build it",
  description:
    "Describe a company or SaaS idea and a founding team of AI agents drafts the plan, brand, product spec, landing page, and launch kit — live. Free while we validate demand.",
  alternates: { canonical: "/studio" },
};

const TEAM = [
  { icon: Compass, title: "Strategist", blurb: "Positioning, ICP, business model" },
  { icon: Palette, title: "Brand Designer", blurb: "Name, voice, and palette" },
  { icon: Boxes, title: "Product Lead", blurb: "Features, MVP cut, pricing" },
  { icon: LayoutTemplate, title: "Landing Page Engineer", blurb: "A real public page" },
  { icon: Megaphone, title: "Marketing Lead", blurb: "Tweets, post, cold email" },
];

const STEPS = [
  {
    n: "1",
    title: "Describe the idea",
    body: "One honest paragraph is enough — the sharper the input, the sharper the build.",
  },
  {
    n: "2",
    title: "Watch it get built",
    body: "Five agents work in sequence, streaming their thinking and output into a live feed.",
  },
  {
    n: "3",
    title: "Share the page",
    body: "Every company gets a public landing page and a launch kit you can copy and fire.",
  },
];

export default function StudioPage() {
  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-lobster/[0.07] blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-5 pb-14 pt-20 text-center sm:px-6 sm:pt-24">
          <p className="anim-rise font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
            Clawmart Studio · new
          </p>
          <h1
            className="anim-rise mt-5 text-balance font-display text-[clamp(2.4rem,6.5vw,4.4rem)] leading-[1.03] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Describe your company.{" "}
            <em className="italic text-lobster">Watch a founding team build it.</em>
          </h1>
          <p
            className="anim-rise mx-auto mt-6 max-w-xl text-pretty text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]"
            style={{ animationDelay: "160ms" }}
          >
            Describe a company or SaaS idea and a founding team of AI agents drafts the plan, brand,
            product spec, a live landing page, and a launch kit — while you watch it happen.
          </p>
        </div>
      </section>

      {/* ---------- Launcher ---------- */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <StudioLauncher />
        </div>
      </section>

      {/* ---------- Founding team ---------- */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            The founding team
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Five agents, one company.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TEAM.map((m) => (
              <div key={m.title} className="rounded-xl border border-border bg-card/40 p-5">
                <m.icon className="size-5 text-lobster" aria-hidden="true" />
                <p className="mt-3 text-[14px] font-medium tracking-tight">{m.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {m.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            How it works
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card/40 p-6">
                <span className="inline-flex size-8 items-center justify-center rounded-lg border border-lobster/40 font-mono text-[13px] text-lobster">
                  {s.n}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            Everything the agents produce is an AI-generated draft to react to and edit — a starting
            point, not a validated business or a guarantee of results. Each concept company is
            pre-launch by definition.
          </p>
        </div>
      </section>
    </div>
  );
}

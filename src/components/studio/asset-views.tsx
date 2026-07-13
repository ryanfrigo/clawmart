import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CopyButton } from "@/components/studio/copy-button";

/* ---------------- defensive parsing helpers ---------------- */

/** Parse a stringified asset; return null on any malformed input. */
function parse(json: string | undefined): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/* ---------------- small presentational bits ---------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/90">{value}</p>
    </div>
  );
}

function Bullets({ label, items }: { label: string; items: unknown[] }) {
  const clean = items.map(str).filter((s): s is string => !!s);
  if (clean.length === 0) return null;
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <ul className="mt-2 space-y-1.5">
        {clean.map((it, i) => (
          <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-foreground/85">
            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-lobster/70" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ note }: { note: string }) {
  return <p className="text-[13.5px] leading-relaxed text-muted-foreground">{note}</p>;
}

/* ---------------- Plan (strategist) ---------------- */

export function PlanView({ json }: { json?: string }) {
  const d = parse(json);
  if (!d) return <Empty note="The strategy output couldn't be read." />;

  const competitors = list(d.competitors)
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
    .filter((c): c is Record<string, unknown> => !!c);

  return (
    <div className="space-y-6">
      <Field label="Positioning" value={str(d.positioning)} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Problem" value={str(d.problem)} />
        <Field label="Solution" value={str(d.solution)} />
      </div>
      <Field label="Business model" value={str(d.businessModel)} />
      <Bullets label="Ideal customers" items={list(d.icp)} />
      {competitors.length > 0 && (
        <div>
          <Eyebrow>Competitors</Eyebrow>
          <div className="mt-2 space-y-2">
            {competitors.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
                {str(c.name) && (
                  <p className="text-[13.5px] font-medium text-foreground">{str(c.name)}</p>
                )}
                {str(c.angle) && (
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    {str(c.angle)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Bullets label="Risks" items={list(d.risks)} />
      <Bullets label="Next 90 days" items={list(d.next90Days)} />
    </div>
  );
}

/* ---------------- Brand ---------------- */

export function BrandView({ json }: { json?: string }) {
  const d = parse(json);
  if (!d) return <Empty note="The brand output couldn't be read." />;

  const colors =
    d.colors && typeof d.colors === "object" && !Array.isArray(d.colors)
      ? (d.colors as Record<string, unknown>)
      : {};
  const swatches = (["primary", "accent", "background", "foreground"] as const)
    .map((k) => ({ k, hex: str(colors[k]) }))
    .filter((s) => !!s.hex && HEX.test(s.hex)) as { k: string; hex: string }[];

  return (
    <div className="space-y-6">
      {str(d.name) && (
        <div>
          <Eyebrow>Name</Eyebrow>
          <p className="mt-1 font-display text-3xl tracking-tight">{str(d.name)}</p>
          {str(d.tagline) && (
            <p className="mt-1 text-[15px] italic text-muted-foreground">{str(d.tagline)}</p>
          )}
        </div>
      )}
      <Field label="One-liner" value={str(d.oneLiner)} />
      <Field label="Voice" value={str(d.voice)} />
      {swatches.length > 0 && (
        <div>
          <Eyebrow>Palette</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-3">
            {swatches.map((s) => (
              <div key={s.k} className="flex items-center gap-2">
                <span
                  className="size-8 rounded-md border border-border"
                  style={{ backgroundColor: s.hex }}
                />
                <div className="leading-tight">
                  <p className="text-[12px] capitalize text-foreground/90">{s.k}</p>
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">{s.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Product ---------------- */

export function ProductView({ json }: { json?: string }) {
  const d = parse(json);
  if (!d) return <Empty note="The product spec couldn't be read." />;

  const features = list(d.coreFeatures)
    .map((f) => (f && typeof f === "object" ? (f as Record<string, unknown>) : null))
    .filter((f): f is Record<string, unknown> => !!f);
  const pricing = list(d.pricing)
    .map((p) => (p && typeof p === "object" ? (p as Record<string, unknown>) : null))
    .filter((p): p is Record<string, unknown> => !!p);

  return (
    <div className="space-y-6">
      <Field label="Summary" value={str(d.summary)} />
      {features.length > 0 && (
        <div>
          <Eyebrow>Core features</Eyebrow>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {features.map((f, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
                {str(f.title) && (
                  <p className="text-[13.5px] font-medium text-foreground">{str(f.title)}</p>
                )}
                {str(f.description) && (
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {str(f.description)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Bullets label="MVP cut" items={list(d.mvpCut)} />
      <Bullets label="Later ideas" items={list(d.laterIdeas)} />
      {pricing.length > 0 && (
        <div>
          <Eyebrow>Pricing</Eyebrow>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {pricing.map((p, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
                {str(p.tier) && (
                  <p className="text-[13px] font-medium text-foreground">{str(p.tier)}</p>
                )}
                {str(p.price) && (
                  <p className="mt-0.5 font-display text-xl text-lobster">{str(p.price)}</p>
                )}
                {list(p.includes).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {list(p.includes)
                      .map(str)
                      .filter((s): s is string => !!s)
                      .map((inc, j) => (
                        <li key={j} className="text-[12px] leading-relaxed text-muted-foreground">
                          {inc}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Landing (preview + link) ---------------- */

export function LandingView({
  json,
  slug,
  isLive,
}: {
  json?: string;
  slug: string;
  isLive: boolean;
}) {
  const d = parse(json);
  const hero =
    d && d.hero && typeof d.hero === "object" && !Array.isArray(d.hero)
      ? (d.hero as Record<string, unknown>)
      : {};

  return (
    <div className="space-y-5">
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        The landing page is rendered from this content at the company&apos;s public URL. Here&apos;s
        the hero preview.
      </p>
      <div className="rounded-xl border border-border bg-background/40 p-5">
        <p className="font-display text-2xl leading-tight tracking-tight">
          {str(hero.headline) ?? "Headline pending…"}
        </p>
        {str(hero.subheadline) && (
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {str(hero.subheadline)}
          </p>
        )}
        {str(hero.cta) && (
          <span className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground">
            {str(hero.cta)}
          </span>
        )}
      </div>
      {isLive ? (
        <Link
          href={`/c/${slug}`}
          className="inline-flex items-center gap-2 rounded-lg border border-lobster/40 px-4 py-2 text-[13.5px] font-medium text-lobster transition-colors hover:bg-lobster/10"
        >
          Open the public page
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <p className="text-[12.5px] text-muted-foreground">
          The public page goes live when the build finishes.
        </p>
      )}
    </div>
  );
}

/* ---------------- Marketing ---------------- */

export function MarketingView({ json }: { json?: string }) {
  const d = parse(json);
  if (!d) return <Empty note="The launch kit couldn't be read." />;

  const tweets = list(d.tweets)
    .map(str)
    .filter((s): s is string => !!s);
  const linkedin = str(d.linkedinPost);
  const email =
    d.coldEmail && typeof d.coldEmail === "object" && !Array.isArray(d.coldEmail)
      ? (d.coldEmail as Record<string, unknown>)
      : {};
  const subject = str(email.subject);
  const body = str(email.body);

  return (
    <div className="space-y-6">
      {tweets.length > 0 && (
        <div>
          <Eyebrow>Launch tweets</Eyebrow>
          <div className="mt-2 grid gap-2">
            {tweets.map((t, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[13.5px] leading-relaxed text-foreground/90">{t}</p>
                <div className="mt-2">
                  <CopyButton text={t} what="Tweet" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {linkedin && (
        <div>
          <div className="flex items-center justify-between">
            <Eyebrow>LinkedIn post</Eyebrow>
            <CopyButton text={linkedin} what="Post" />
          </div>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-background/40 p-3 font-sans text-[13.5px] leading-relaxed text-foreground/90">
            {linkedin}
          </pre>
        </div>
      )}

      {(subject || body) && (
        <div>
          <div className="flex items-center justify-between">
            <Eyebrow>Cold email</Eyebrow>
            <CopyButton
              text={[subject && `Subject: ${subject}`, body].filter(Boolean).join("\n\n")}
              what="Email"
            />
          </div>
          <div className="mt-2 rounded-lg border border-border bg-background/40 p-3">
            {subject && (
              <p className="text-[13px] text-foreground">
                <span className="text-muted-foreground">Subject: </span>
                {subject}
              </p>
            )}
            {body && (
              <pre className="mt-2 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground/90">
                {body}
              </pre>
            )}
          </div>
        </div>
      )}

      <Bullets label="Launch checklist" items={list(d.launchChecklist)} />
    </div>
  );
}

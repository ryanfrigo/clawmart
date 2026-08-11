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

/** A field name. Mono is allowed here because a value always sits under it. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="stamp">{children}</p>;
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1.5 max-w-[68ch] text-[14px] leading-[1.6] text-foreground/90">{value}</p>
    </div>
  );
}

function Bullets({ label, items }: { label: string; items: unknown[] }) {
  const clean = items.map(str).filter((s): s is string => !!s);
  if (clean.length === 0) return null;
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <ul className="mt-2">
        {clean.map((it, i) => (
          <li
            key={i}
            className="flex gap-3 border-b border-[color:var(--border)] py-1.5 text-[13.5px] leading-[1.55] text-foreground/85 last:border-b-0"
          >
            <span className="stamp shrink-0 pt-0.5 text-tide">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 max-w-[68ch]">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ note }: { note: string }) {
  return (
    <div className="well flex min-h-24 items-center justify-center px-6 text-center">
      <p className="stamp">{note}</p>
    </div>
  );
}

/** A cell inside a bolted wall of peers. */
function Cell({ children }: { children: React.ReactNode }) {
  return <div className="p-3">{children}</div>;
}

/* ---------------- Plan (strategist) ---------------- */

export function PlanView({ json }: { json?: string }) {
  const d = parse(json);
  if (!d) return <Empty note="Strategy output unreadable" />;

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
          <div className="seam-wall mt-2 sm:grid-cols-2">
            {competitors.map((c, i) => (
              <Cell key={i}>
                {str(c.name) && (
                  <p className="text-[13.5px] font-medium text-foreground">{str(c.name)}</p>
                )}
                {str(c.angle) && (
                  <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">
                    {str(c.angle)}
                  </p>
                )}
              </Cell>
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
  if (!d) return <Empty note="Brand output unreadable" />;

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
          {/* The generated company's own identity — one of the two serif
              allowances in this file. */}
          <p className="d3 mt-1">{str(d.name)}</p>
          {str(d.tagline) && (
            <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
              {str(d.tagline)}
            </p>
          )}
        </div>
      )}
      <Field label="One-liner" value={str(d.oneLiner)} />
      <Field label="Voice" value={str(d.voice)} />
      {swatches.length > 0 && (
        <div>
          <Eyebrow>Palette</Eyebrow>
          <div className="seam-wall mt-2 grid-cols-2 sm:grid-cols-4">
            {swatches.map((s) => (
              <div key={s.k}>
                <span
                  aria-hidden="true"
                  className="block h-12 w-full"
                  style={{ backgroundColor: s.hex }}
                />
                <div className="border-t border-[color:var(--border)] p-2">
                  <p className="stamp">{s.k}</p>
                  <p className="mt-0.5 font-mono text-[11.5px] uppercase text-foreground/85">
                    {s.hex}
                  </p>
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
  if (!d) return <Empty note="Product spec unreadable" />;

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
          <div className="seam-wall mt-2 sm:grid-cols-2">
            {features.map((f, i) => (
              <Cell key={i}>
                {str(f.title) && (
                  <p className="text-[13.5px] font-medium text-foreground">{str(f.title)}</p>
                )}
                {str(f.description) && (
                  <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">
                    {str(f.description)}
                  </p>
                )}
              </Cell>
            ))}
          </div>
        </div>
      )}
      <Bullets label="MVP cut" items={list(d.mvpCut)} />
      <Bullets label="Later ideas" items={list(d.laterIdeas)} />
      {pricing.length > 0 && (
        <div>
          <Eyebrow>Pricing</Eyebrow>
          <div className="seam-wall mt-2 sm:grid-cols-3">
            {pricing.map((p, i) => (
              <Cell key={i}>
                {str(p.tier) && (
                  <p className="stamp text-tide">{str(p.tier)}</p>
                )}
                {str(p.price) && (
                  <p className="tnum mt-1 font-mono text-[18px] text-foreground">
                    {str(p.price)}
                  </p>
                )}
                {list(p.includes).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {list(p.includes)
                      .map(str)
                      .filter((s): s is string => !!s)
                      .map((inc, j) => (
                        <li key={j} className="text-[12.5px] leading-[1.5] text-muted-foreground">
                          {inc}
                        </li>
                      ))}
                  </ul>
                )}
              </Cell>
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
      <p className="max-w-[68ch] text-[13.5px] leading-[1.55] text-muted-foreground">
        The public page is rendered from this content at the company&apos;s own URL. This
        is the hero preview.
      </p>
      <div className="well overflow-hidden">
        <p className="stamp border-b border-[color:var(--border)] px-4 py-2">Hero</p>
        <div className="p-4">
          {/* The generated company's own headline — the second serif allowance. */}
          <p className="font-display text-[24px] leading-tight tracking-tight">
            {str(hero.headline) ?? "Headline pending…"}
          </p>
          {str(hero.subheadline) && (
            <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">
              {str(hero.subheadline)}
            </p>
          )}
          {str(hero.cta) && (
            <span className="mt-4 inline-flex items-center rounded-[3px] border border-[color:var(--rule)] px-3 py-1.5 text-[12.5px] text-muted-foreground">
              {str(hero.cta)}
            </span>
          )}
        </div>
      </div>
      {isLive ? (
        <Link
          href={`/c/${slug}`}
          className="inline-flex h-9 items-center gap-2 rounded-[3px] border border-[color:var(--rule)] px-4 text-[13.5px] font-semibold outline-none transition-colors duration-[120ms] hover:bg-accent"
        >
          Open the public page
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <p className="stamp">Public page goes live when the build finishes</p>
      )}
    </div>
  );
}

/* ---------------- Marketing ---------------- */

export function MarketingView({ json }: { json?: string }) {
  const d = parse(json);
  if (!d) return <Empty note="Launch kit unreadable" />;

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
          <Eyebrow>Launch posts</Eyebrow>
          <div className="seam-wall mt-2">
            {tweets.map((t, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-3">
                <p className="max-w-[68ch] text-[13.5px] leading-[1.6] text-foreground/90">{t}</p>
                <CopyButton text={t} what="Post" className="shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {linkedin && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>LinkedIn post</Eyebrow>
            <CopyButton text={linkedin} what="Post" />
          </div>
          <div className="well mt-2 p-3">
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.65] text-foreground/90">
              {linkedin}
            </p>
          </div>
        </div>
      )}

      {(subject || body) && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Cold email</Eyebrow>
            <CopyButton
              text={[subject && `Subject: ${subject}`, body].filter(Boolean).join("\n\n")}
              what="Email"
            />
          </div>
          <div className="well mt-2 overflow-hidden">
            {subject && (
              <p className="flex gap-2 border-b border-[color:var(--border)] px-3 py-2 text-[13px]">
                <span className="stamp shrink-0 pt-0.5">Subject</span>
                <span className="text-foreground">{subject}</span>
              </p>
            )}
            {body && (
              <p className="whitespace-pre-wrap p-3 text-[13.5px] leading-[1.65] text-foreground/90">
                {body}
              </p>
            )}
          </div>
        </div>
      )}

      <Bullets label="Launch checklist" items={list(d.launchChecklist)} />
    </div>
  );
}

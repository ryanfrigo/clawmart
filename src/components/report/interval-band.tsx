import { formatPct } from "@/components/site/constants";

/**
 * Wilson-interval visualization: a track from 0–100% with the uncertainty
 * band filled and a tick at the point estimate. Honest by construction —
 * the band is always drawn, never hidden.
 */
export function IntervalBand({
  interval,
  tone = "lobster",
  compact = false,
}: {
  interval: { low: number; high: number; point: number };
  tone?: "lobster" | "tide" | "sand";
  compact?: boolean;
}) {
  const toneBand = {
    lobster: "bg-lobster/35",
    tide: "bg-tide/35",
    sand: "bg-sand/35",
  }[tone];
  const toneTick = {
    lobster: "bg-lobster",
    tide: "bg-tide",
    sand: "bg-sand",
  }[tone];

  const low = Math.max(0, Math.min(1, interval.low));
  const high = Math.max(low, Math.min(1, interval.high));
  const point = Math.max(0, Math.min(1, interval.point));

  return (
    <div>
      <div
        className={`relative w-full overflow-hidden rounded-full bg-muted ${
          compact ? "h-1.5" : "h-2.5"
        }`}
        role="img"
        aria-label={`Mention rate ${formatPct(point)}, 95% interval ${formatPct(low)} to ${formatPct(high)}`}
      >
        <div
          className={`absolute inset-y-0 rounded-full ${toneBand}`}
          style={{ left: `${low * 100}%`, width: `${(high - low) * 100}%` }}
        />
        <div
          className={`absolute inset-y-0 w-[3px] rounded-full ${toneTick}`}
          style={{ left: `calc(${point * 100}% - 1.5px)` }}
        />
      </div>
      {!compact && (
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
          {formatPct(low)}–{formatPct(high)} (95% interval) · point{" "}
          {formatPct(point)}
        </p>
      )}
    </div>
  );
}

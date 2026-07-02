type SovRow = { name: string; mentions: number; isYou: boolean };

export function ShareOfVoice({ rows }: { rows: SovRow[] }) {
  const sorted = [...rows].sort((a, b) => b.mentions - a.mentions);
  const max = Math.max(1, ...sorted.map((r) => r.mentions));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Brand
              </th>
              <th className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Mentions
              </th>
              <th className="w-1/2 py-2 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Share of sampled answers
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.name} className="border-b border-border/60">
                <td className="py-3 pr-4 text-[13.5px]">
                  <span className={r.isYou ? "font-semibold text-lobster" : ""}>
                    {r.name}
                  </span>
                  {r.isYou ? (
                    <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-lobster/80">
                      you
                    </span>
                  ) : (
                    <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/70">
                      inferred
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 font-mono text-[13px]">{r.mentions}</td>
                <td className="py-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        r.isYou ? "bg-lobster" : "bg-foreground/25"
                      }`}
                      style={{ width: `${(r.mentions / max) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        Competitors were inferred from your homepage and category — a
        different competitor set can tell a different story. Counts are raw
        mention totals across all sampled answers in this report.
      </p>
    </div>
  );
}

import { computeInsights, type InsightBlock } from "@/lib/insights";

// Community Insights renderer — moved from the player-facing page into the admin
// area (internal tool for engagement, comms, and storytelling). Renders the same
// computeInsights() output as plain titled bar groups (no nested cards), so it
// sits cleanly inside an admin section.

function Bars({ block }: { block: InsightBlock }) {
  const max = Math.max(...block.bars.map((b) => b.pct), 1);
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
        <span aria-hidden>{block.emoji}</span>
        {block.title}
      </p>
      <div className="mt-3 space-y-2.5">
        {block.bars.map((b) => (
          <div key={b.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold">
                {b.flag ? `${b.flag} ` : ""}
                {b.label}
              </span>
              <span className="tabular-nums text-[var(--color-muted)]">{b.pct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
              <div
                className="h-full rounded-full bg-[var(--color-pitch)]"
                style={{ width: `${(b.pct / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsBoard({
  participants,
}: {
  participants: Parameters<typeof computeInsights>[0];
}) {
  const blocks = computeInsights(participants).filter((b) => b.bars.length);
  if (!blocks.length) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No predictions yet — insights appear here as picks roll in.
      </p>
    );
  }
  return (
    <div className="divide-y divide-[var(--color-line)]">
      {blocks.map((b, i) => (
        <div key={b.id} className={i > 0 ? "pt-6" : ""}>
          <Bars block={b} />
          {i < blocks.length - 1 ? <div className="pb-6" /> : null}
        </div>
      ))}
    </div>
  );
}

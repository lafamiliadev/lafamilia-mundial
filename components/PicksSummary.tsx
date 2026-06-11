import { teamFlag, teamName } from "@/lib/teams";
import { playerName } from "@/lib/players";
import type { Predictions } from "@/lib/types";

// A clean, scannable summary of a member's submitted picks — the same idea as
// the collectible card, in-app. Used inside the "your bracket" box so people can
// always see what they picked (especially once it's locked).
export function PicksSummary({ predictions: p }: { predictions: Predictions }) {
  const finalFour = p.semifinalists ?? [];
  const winnerCodes = Object.keys(p.groupWinners ?? {})
    .sort()
    .map((l) => (p.groupWinners ?? {})[l])
    .filter(Boolean);
  const b = p.bonus ?? null;
  const bonusRows: { label: string; value: string }[] = [];
  if (b?.goldenBall) bonusRows.push({ label: "Golden Ball", value: playerName(b.goldenBall) });
  if (b?.goldenBoot) bonusRows.push({ label: "Golden Boot", value: playerName(b.goldenBoot) });
  if (b?.goldenGlove) bonusRows.push({ label: "Golden Glove", value: playerName(b.goldenGlove) });
  if (b?.darkHorse) bonusRows.push({ label: "Dark Horse", value: `${teamFlag(b.darkHorse)} ${teamName(b.darkHorse)}` });

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="shrink-0 text-sm text-[var(--color-muted)]">{label}</span>
      <span className="min-w-0 text-right font-semibold">{children}</span>
    </div>
  );

  return (
    <div className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
      <Row label="Champion">
        <span className="inline-flex items-center gap-1.5">
          🏆 <span>{teamFlag(p.champion)}</span> {teamName(p.champion)}
        </span>
      </Row>
      <Row label="Final Four">
        <span className="text-lg leading-none">
          {finalFour.length ? finalFour.map((c) => teamFlag(c)).join(" ") : "—"}
        </span>
      </Row>
      <Row label="Group winners">
        <span className="flex flex-wrap justify-end gap-x-1 text-base leading-tight">
          {winnerCodes.length ? winnerCodes.map((c, i) => <span key={i}>{teamFlag(c)}</span>) : "—"}
        </span>
      </Row>
      <Row label="Goals in the final">{p.finalTotalGoals ?? "—"}</Row>
      {bonusRows.length > 0 &&
        bonusRows.map((r) => (
          <Row key={r.label} label={r.label}>
            <span className="text-sm">{r.value}</span>
          </Row>
        ))}
    </div>
  );
}

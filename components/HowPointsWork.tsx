import type { ReactNode } from "react";
import type { ScoringWeights } from "@/lib/types";

// A plain-language explainer of the one-game model, for non-experts. Native
// <details> (no client JS) so it sits quietly on the Picks hub, always there
// when someone wants it. Same information as the Leaderboard's explainer — the
// four games with their actual point values — kept in sync via the shared
// ScoringWeights so the two never drift.

function PtRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="font-semibold text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

export function HowPointsWork({ w }: { w: ScoringWeights }) {
  const bracketMax = w.groupWinner * 12 + w.semifinalist * 4 + w.champion;
  const bonusMax = w.goldenBall + w.goldenBoot + w.goldenGlove + w.darkHorseSf;
  return (
    <details className="card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 [&::-webkit-details-marker]:hidden">
        <span className="font-bold">ⓘ How points work</span>
        <span className="text-[var(--color-muted)]">▾</span>
      </summary>
      <div className="space-y-4 px-4 pb-4">
        <p className="text-sm text-[var(--color-muted)]">
          It&apos;s all one score — four games, your Overall adds them all up.
        </p>

        <div>
          <div className="mb-1 flex items-center justify-between font-bold">
            <span>🏆 The Bracket</span>
            <span className="text-[var(--color-pitch)]">up to {bracketMax}</span>
          </div>
          <div className="space-y-1">
            <PtRow label="🥇 Group winners" value={`${w.groupWinner} each · up to ${w.groupWinner * 12}`} />
            <PtRow label="🎯 Final Four" value={`${w.semifinalist} each · up to ${w.semifinalist * 4}`} />
            <PtRow label="👑 Champion" value={w.champion} />
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] pt-3">
          <div className="mb-1 flex items-center justify-between font-bold">
            <span>⭐ Bonus Picks</span>
            <span className="text-[var(--color-pitch)]">up to {bonusMax}</span>
          </div>
          <div className="space-y-1">
            <PtRow label="Golden Ball" value={w.goldenBall} />
            <PtRow label="Golden Boot" value={w.goldenBoot} />
            <PtRow label="Golden Glove" value={w.goldenGlove} />
            <PtRow
              label={<>Dark Horse <span className="text-[var(--color-muted)]">(R16 / QF / SF)</span></>}
              value={`${w.darkHorseR16} / ${w.darkHorseQf} / ${w.darkHorseSf}`}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Dark Horse pays the furthest round reached — not added up.</p>
        </div>

        <div className="border-t border-[var(--color-line)] pt-3">
          <div className="mb-1 font-bold">
            ⚽ Predict the score <span className="font-normal text-[var(--color-muted)]">· LatAm + Spain</span>
          </div>
          <div className="space-y-1">
            <PtRow label="Exact score" value="+3" />
            <PtRow label="Right result only" value="+1" />
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Based on the 90-minute result — extra time and penalties don&apos;t count.
          </p>
        </div>

        <div className="border-t border-[var(--color-line)] pt-3">
          <div className="mb-1 font-bold">
            🏅 Knockout Picks <span className="font-normal text-[var(--color-muted)]">· per round</span>
          </div>
          <div className="space-y-1">
            <PtRow
              label="Per correct winner (R32 / R16 / QF / SF / Final)"
              value={`${w.liveR32} / ${w.liveR16} / ${w.liveQf} / ${w.liveSf} / ${w.liveFinal}`}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-gold)]">⚡ Double Down</span>
            {" — tag your most confident pick each round; if it's right it scores "}
            <span className="font-semibold">double</span>. Wrong = no penalty.
          </p>
        </div>

        <p className="border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
          Ties are broken by your goals-in-the-final guess. Familia Honors are titles — they don&apos;t add points.
        </p>
      </div>
    </details>
  );
}

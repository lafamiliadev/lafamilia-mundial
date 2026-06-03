import { TEAM_BY_CODE } from "./teams";
import type { Predictions, Results, ScoreBreakdown, Settings } from "./types";

function teamLabel(code: string): string {
  return TEAM_BY_CODE[code]?.name ?? code;
}

/** The teams that reached the semifinals — the "Final Four" to score against. */
function actualSemifinalists(results: Results): string[] {
  return results.stageReached.sf ?? [];
}

/**
 * Pure scoring function for the "Group Winners + Final Four" format. Given one
 * participant's predictions, the actual results, and configured settings,
 * returns a full point breakdown. Deterministic + side-effect free → trivially
 * unit-testable and reused by both the cron route and admin "Recalculate".
 *
 * Scoring waves over the tournament:
 *  - group stage ends → group winners + (possible) clean-sweep bonus
 *  - semifinals       → each correct semifinalist
 *  - final            → champion
 */
export function scorePredictions(
  predictions: Predictions,
  results: Results,
  settings: Settings,
): Omit<ScoreBreakdown, "participantId"> {
  const w = settings.weights;
  const lines: { label: string; points: number }[] = [];
  const bonusLines: { label: string; points: number }[] = [];

  // --- Group winners (12 groups) ---
  const actualGroups = results.groupWinners ?? {};
  const picks = predictions.groupWinners ?? {};
  let groupHits = 0;
  for (const [letter, actualCode] of Object.entries(actualGroups)) {
    if (!actualCode) continue; // group winner not known yet
    if (picks[letter] && picks[letter] === actualCode) {
      groupHits++;
      lines.push({ label: `Group ${letter}: ${teamLabel(actualCode)}`, points: w.groupWinner });
    }
  }
  // Clean-sweep bonus only once every group is decided and all 12 are correct.
  const groupsDecided = Object.values(actualGroups).filter(Boolean).length;
  if (groupsDecided >= 12 && groupHits >= 12) {
    bonusLines.push({ label: "All 12 group winners! 🧹", points: w.groupSweepBonus });
  }

  // --- Final Four (semifinalists) ---
  const semis = actualSemifinalists(results);
  const sfPicks = predictions.semifinalists ?? [];
  for (const code of sfPicks) {
    if (semis.includes(code)) {
      lines.push({ label: `Semifinalist: ${teamLabel(code)}`, points: w.semifinalist });
    }
  }

  // --- Champion ---
  if (predictions.champion && predictions.champion === results.champion) {
    lines.push({ label: "Champion", points: w.champion });
  }

  const base = lines.reduce((s, l) => s + l.points, 0);
  const bonus = bonusLines.reduce((s, l) => s + l.points, 0);

  return {
    base,
    bonus,
    total: base + bonus,
    lines: [...lines, ...bonusLines],
  };
}

/**
 * Rank a set of scored participants. Ties broken by closeness of the
 * final-total-goals prediction to the actual figure (when known), then name.
 */
export function rankParticipants(
  scored: {
    participantId: string;
    name: string;
    total: number;
    finalTotalGoals: number | null;
  }[],
  actualFinalGoals: number | null,
): { participantId: string; rank: number }[] {
  const sorted = [...scored].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (actualFinalGoals != null) {
      const da = a.finalTotalGoals == null ? Infinity : Math.abs(a.finalTotalGoals - actualFinalGoals);
      const db = b.finalTotalGoals == null ? Infinity : Math.abs(b.finalTotalGoals - actualFinalGoals);
      if (da !== db) return da - db;
    }
    return a.name.localeCompare(b.name);
  });

  // Standard competition ranking (1,2,2,4) on total only.
  const result: { participantId: string; rank: number }[] = [];
  let lastTotal: number | null = null;
  let lastRank = 0;
  sorted.forEach((p, i) => {
    const rank = lastTotal === p.total ? lastRank : i + 1;
    result.push({ participantId: p.participantId, rank });
    lastTotal = p.total;
    lastRank = rank;
  });
  return result;
}

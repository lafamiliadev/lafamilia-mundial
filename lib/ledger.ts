// Pure builder for a player's "points ledger" — the human-readable list of how
// each point was earned, shown in the leaderboard drawer. No I/O, so the line
// expansion (especially per-match score picks) is unit-testable.

import type { ScoreLine, ScoreMatch, ScorePrediction } from "./types";

export type LedgerLine = {
  points: number;
  /** Full descriptor, e.g. "Exact score · Mexico vs South Africa · Jun 11". */
  text: string;
  group: "bracket" | "bonus" | "live" | "score";
};

/** "Jun 11" in US Eastern (the tournament's reference zone). */
export function shortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Build the ledger lines for one player. Bracket / bonus / live lines come from
 * the scoring engine's own labels; the aggregate "score-pick" line is dropped
 * and replaced with one line PER scored match prediction (so users see exactly
 * which game earned the points). Only positive-point entries are included.
 * Sorted by points descending — biggest contributions first.
 */
export function buildLedgerLines(
  scoreLines: ScoreLine[],
  predictions: ScorePrediction[],
  matches: ScoreMatch[],
): LedgerLine[] {
  const lines: LedgerLine[] = [];

  for (const l of scoreLines) {
    if (l.group === "score-pick") continue; // expanded per-match below
    if (l.points <= 0) continue;
    lines.push({ points: l.points, text: l.label, group: l.group });
  }

  const byId = new Map(matches.map((m) => [m.matchId, m]));
  for (const p of predictions) {
    if (!p.pointsAwarded || p.pointsAwarded <= 0) continue;
    const m = byId.get(p.matchId);
    const teams = m ? `${m.teamA} vs ${m.teamB}` : p.matchId;
    const date = m ? shortDate(m.kickoffUtc) : "";
    const reason = p.pointsAwarded >= 3 ? "Exact score" : "Correct winner";
    lines.push({
      points: p.pointsAwarded,
      text: `${reason} · ${teams}${date ? ` · ${date}` : ""}`,
      group: "score",
    });
  }

  return lines.sort((a, b) => b.points - a.points);
}

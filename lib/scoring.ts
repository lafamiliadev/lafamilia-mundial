import { playerName } from "./players";
import { TEAM_BY_CODE } from "./teams";
import {
  LIVE_ROUND_POINTS,
  type LivePick,
  type Predictions,
  type Results,
  type ScoreLine,
  type ScoreResult,
  type Settings,
  type Stage,
} from "./types";

function teamLabel(code: string): string {
  return TEAM_BY_CODE[code]?.name ?? code;
}

/** The teams that reached the semifinals — the "Final Four" to score against. */
function actualSemifinalists(results: Results): string[] {
  return results.stageReached.sf ?? [];
}

const STAGE_ORDER: Stage[] = ["r16", "qf", "sf", "final", "champion"];
function reachedAtLeast(results: Results, code: string | null, stage: Stage): boolean {
  if (!code) return false;
  const minIdx = STAGE_ORDER.indexOf(stage);
  for (let i = minIdx; i < STAGE_ORDER.length; i++) {
    if ((results.stageReached[STAGE_ORDER[i]] ?? []).includes(code)) return true;
  }
  return false;
}

/**
 * Score one bonus score prediction: +3 for exact score, +1 for correct result
 * (winner or draw), 0 for wrong result. Pure function — no side effects.
 */
export function scoreMatchPrediction(
  predicted: { scoreA: number; scoreB: number },
  actual: { scoreA: number; scoreB: number },
): number {
  if (predicted.scoreA === actual.scoreA && predicted.scoreB === actual.scoreB) return 3;
  const predictedResult = Math.sign(predicted.scoreA - predicted.scoreB);
  const actualResult = Math.sign(actual.scoreA - actual.scoreB);
  return predictedResult === actualResult ? 1 : 0;
}

/**
 * Pure scoring for one participant across all competitions: the original
 * bracket, the bonus picks, the live knockout picks, and (when supplied) the
 * bonus score prediction points already awarded in the DB.
 * Returns a per-slice breakdown so the Overall / Bracket / Live leaderboard
 * views can each rank on their own number. Deterministic + side-effect free.
 */
export function scorePredictions(
  predictions: Predictions,
  results: Results,
  settings: Settings,
  livePicks: LivePick[] = [],
  scorePredictionBonus: number = 0,
): ScoreResult {
  const w = settings.weights;
  const lines: ScoreLine[] = [];

  // ─── Original bracket ───
  const actualGroups = results.groupWinners ?? {};
  const picks = predictions.groupWinners ?? {};
  let groupHits = 0;
  for (const [letter, actualCode] of Object.entries(actualGroups)) {
    if (!actualCode) continue;
    if (picks[letter] && picks[letter] === actualCode) {
      groupHits++;
      lines.push({ label: `Group ${letter}: ${teamLabel(actualCode)}`, points: w.groupWinner, group: "bracket" });
    }
  }
  const groupsDecided = Object.values(actualGroups).filter(Boolean).length;
  if (groupsDecided >= 12 && groupHits >= 12) {
    lines.push({ label: "All 12 group winners! 🧹", points: w.groupSweepBonus, group: "bracket" });
  }
  const semis = actualSemifinalists(results);
  // Dedupe defensively: the wizard enforces 4 distinct picks, but the engine
  // must never score the same team twice even if a bad write slipped a dupe in.
  for (const code of new Set(predictions.semifinalists ?? [])) {
    if (semis.includes(code)) {
      lines.push({ label: `Semifinalist: ${teamLabel(code)}`, points: w.semifinalist, group: "bracket" });
    }
  }
  if (predictions.champion && predictions.champion === results.champion) {
    lines.push({ label: "Champion", points: w.champion, group: "bracket" });
  }

  // ─── Bonus Picks ───
  const b = predictions.bonus;
  if (b) {
    if (b.goldenBall && results.goldenBall && b.goldenBall === results.goldenBall)
      lines.push({ label: `Golden Ball: ${playerName(b.goldenBall)}`, points: w.goldenBall, group: "bonus" });
    if (b.goldenBoot && results.goldenBoot && b.goldenBoot === results.goldenBoot)
      lines.push({ label: `Golden Boot: ${playerName(b.goldenBoot)}`, points: w.goldenBoot, group: "bonus" });
    if (b.goldenGlove && results.goldenGlove && b.goldenGlove === results.goldenGlove)
      lines.push({ label: `Golden Glove: ${playerName(b.goldenGlove)}`, points: w.goldenGlove, group: "bonus" });
    if (b.darkHorse) {
      // By furthest stage reached (totals, not additive).
      let pts = 0;
      if (reachedAtLeast(results, b.darkHorse, "sf")) pts = w.darkHorseSf;
      else if (reachedAtLeast(results, b.darkHorse, "qf")) pts = w.darkHorseQf;
      else if (reachedAtLeast(results, b.darkHorse, "r16")) pts = w.darkHorseR16;
      if (pts > 0)
        lines.push({ label: `Dark Horse: ${teamLabel(b.darkHorse)}`, points: pts, group: "bonus" });
    }
  }

  // ─── LatAm + Spain Score Prediction Bonus ───
  if (scorePredictionBonus > 0) {
    lines.push({ label: "Score picks", points: scorePredictionBonus, group: "score-pick" });
  }

  // ─── Live Knockout Picks ───
  // Engine-level invariants, independent of how the picks were written: score
  // each match at most once, and double at most ONE correct High Conviction
  // pick per round (so a duplicate or a second ⚡ can never over-award).
  const scoredMatches = new Set<string>();
  const convictionUsed = new Set<string>();
  for (const lp of livePicks) {
    if (scoredMatches.has(lp.matchId)) continue;
    scoredMatches.add(lp.matchId);
    const winner = results.matchWinners[lp.matchId];
    if (!winner || winner !== lp.team) continue;
    const base = w[LIVE_ROUND_POINTS[lp.round]] ?? 0; // guard a missing weight → never NaN
    const doubles = lp.highConviction && !convictionUsed.has(lp.round);
    if (doubles) convictionUsed.add(lp.round);
    lines.push({
      label: `${lp.round.toUpperCase()}: ${teamLabel(lp.team)}${doubles ? " ⚡" : ""}`,
      points: doubles ? base * 2 : base,
      group: "live",
    });
  }

  const sum = (g: ScoreLine["group"]) =>
    lines.filter((l) => l.group === g).reduce((s, l) => s + l.points, 0);
  const bracket = sum("bracket");
  const bonus = sum("bonus");
  const live = sum("live");
  const scorePick = sum("score-pick");

  return { bracket, bonus, live, scorePick, total: bracket + bonus + live + scorePick, lines };
}

/**
 * Rank a set of scored participants. Ranks are standard competition ranking on
 * the total (1,2,2,4). The listed ORDER within equal totals follows the full
 * tie-break chain: correct champion → most correct Live Picks → closest
 * final-goals guess → earliest submission → name.
 */
export function rankParticipants(
  scored: {
    participantId: string;
    name: string;
    total: number;
    finalTotalGoals: number | null;
    /** Did they pick the actual champion? (false until the Final resolves.) */
    championCorrect?: boolean;
    /** How many Live Picks they got right (more = better). */
    liveCorrect?: number;
    /** Submission time (ISO) — earlier wins a dead-heat. */
    submittedAt?: string;
  }[],
  actualFinalGoals: number | null,
): { participantId: string; rank: number }[] {
  const sorted = [...scored].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    // 1) Correct champion beats no champion.
    const ac = a.championCorrect ? 1 : 0;
    const bc = b.championCorrect ? 1 : 0;
    if (ac !== bc) return bc - ac;
    // 2) More correct Live Picks.
    const al = a.liveCorrect ?? 0;
    const bl = b.liveCorrect ?? 0;
    if (al !== bl) return bl - al;
    // 3) Closest goals-in-the-final guess (when the actual figure is known).
    if (actualFinalGoals != null) {
      const da = a.finalTotalGoals == null ? Infinity : Math.abs(a.finalTotalGoals - actualFinalGoals);
      const db = b.finalTotalGoals == null ? Infinity : Math.abs(b.finalTotalGoals - actualFinalGoals);
      if (da !== db) return da - db;
    }
    // 4) Earliest submission.
    if (a.submittedAt && b.submittedAt && a.submittedAt !== b.submittedAt) {
      return a.submittedAt.localeCompare(b.submittedAt);
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

import { TEAM_BY_CODE } from "./teams";
import type {
  Predictions,
  Results,
  ScoreBreakdown,
  Settings,
  Stage,
} from "./types";

const STAGE_ORDER: Stage[] = ["r16", "qf", "sf", "final", "champion"];

function reachedAtLeast(
  results: Results,
  teamCode: string | null,
  stage: Stage,
): boolean {
  if (!teamCode) return false;
  const minIdx = STAGE_ORDER.indexOf(stage);
  for (let i = minIdx; i < STAGE_ORDER.length; i++) {
    const teams = results.stageReached[STAGE_ORDER[i]] ?? [];
    if (teams.includes(teamCode)) return true;
  }
  return false;
}

/**
 * Pure scoring function. Given one participant's predictions, the actual
 * results, and the configured settings, return a full point breakdown.
 * Deterministic and side-effect free → trivially unit-testable and reused by
 * both the cron route and the admin "Recalculate" button.
 */
export function scorePredictions(
  predictions: Predictions,
  results: Results,
  settings: Settings,
): Omit<ScoreBreakdown, "participantId"> {
  const w = settings.weights;
  const lines: { label: string; points: number }[] = [];

  // --- Base predictions ---
  if (predictions.champion && predictions.champion === results.champion) {
    lines.push({ label: "Champion", points: w.champion });
  }
  if (predictions.runnerUp && predictions.runnerUp === results.runnerUp) {
    lines.push({ label: "Runner-up", points: w.runnerUp });
  }
  if (predictions.goldenBoot && predictions.goldenBoot === results.goldenBoot) {
    lines.push({ label: "Golden Boot", points: w.goldenBoot });
  }
  if (predictions.latamFurthest && predictions.latamFurthest === results.latamFurthest) {
    lines.push({ label: "LatAm furthest", points: w.latamFurthest });
  }

  // --- Dark Horse: deterministic, explainable rule ---
  // Correct if the picked team is a genuine outsider (seed >= min) AND reached
  // the configured stage. An explicit admin override (darkHorseTeam) also wins.
  if (predictions.darkHorse) {
    const pick = predictions.darkHorse;
    const seed = TEAM_BY_CODE[pick]?.fifaSeed ?? 4;
    const isOutsider = seed >= settings.darkHorseMinSeed;
    const reached = reachedAtLeast(results, pick, settings.darkHorseReachStage);
    const explicit = results.darkHorseTeam && results.darkHorseTeam === pick;
    if (explicit || (isOutsider && reached)) {
      lines.push({ label: "Dark Horse", points: w.darkHorse });
    }
  }

  const base = lines.reduce((s, l) => s + l.points, 0);

  // --- Progressive bonus: champion pick surviving each round ---
  const champPick = predictions.champion;
  const bonusLines: { label: string; points: number }[] = [];
  if (champPick) {
    if (reachedAtLeast(results, champPick, "r16"))
      bonusLines.push({ label: "Pick reached Round of 16", points: w.bonusR16 });
    if (reachedAtLeast(results, champPick, "qf"))
      bonusLines.push({ label: "Pick reached Quarterfinal", points: w.bonusQf });
    if (reachedAtLeast(results, champPick, "sf"))
      bonusLines.push({ label: "Pick reached Semifinal", points: w.bonusSf });
    if (reachedAtLeast(results, champPick, "final"))
      bonusLines.push({ label: "Pick reached Final", points: w.bonusFinalist });
    if (champPick === results.champion)
      bonusLines.push({ label: "Pick won it all", points: w.bonusChampion });
  }

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

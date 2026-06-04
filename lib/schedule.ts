// Scoring milestones — the moments points land on the leaderboard, used to fuel
// anticipation ("next points drop"). Dates follow the official FIFA World Cup
// 2026 schedule (group stage Jun 11–27; final Jul 19). These are fixed, public
// fixtures — the countdown just teases when the board will move next.

export type ScoringMilestone = {
  /** Short label for the banner. */
  label: string;
  /** When the points become live (ISO, with timezone). */
  dateIso: string;
  /** How many points are in play at this milestone (across all 12 groups, etc.). */
  pointsInPlay: number;
};

export const SCORING_MILESTONES: ScoringMilestone[] = [
  // Group winners are decided when the group stage finishes.
  { label: "Group stage finishes", dateIso: "2026-06-27T23:59:00-04:00", pointsInPlay: 36 },
  // Your Final Four is locked once the quarterfinals are played.
  { label: "Final Four is set", dateIso: "2026-07-11T23:59:00-04:00", pointsInPlay: 40 },
  // Champion (and the goals tiebreaker) resolves at the final.
  { label: "The Final", dateIso: "2026-07-19T23:59:00-04:00", pointsInPlay: 20 },
];

/** The next milestone strictly after `now`, or null if the tournament is done. */
export function nextScoringMilestone(now: Date): ScoringMilestone | null {
  for (const m of SCORING_MILESTONES) {
    if (new Date(m.dateIso).getTime() > now.getTime()) return m;
  }
  return null;
}

// ── Live Picks rounds — when each knockout round's picks open and lock. ──
// Dates follow the official 2026 knockout calendar. Picks for a round open once
// its matchups are confirmed and lock at the round's first kickoff. Base points
// in play are equal each round (16): 16×1, 8×2, 4×4, 2×8, 1×16.
import type { KnockoutRound } from "./types";

export type LiveRound = {
  round: KnockoutRound;
  label: string; // "Round of 32"
  plain: string; // plain-language label
  opensIso: string;
  locksIso: string;
  pointsInPlay: number;
};

export const LIVE_ROUNDS: LiveRound[] = [
  { round: "r32", label: "Round of 32", plain: "the last 32 teams", opensIso: "2026-06-28T09:00:00-04:00", locksIso: "2026-06-28T12:00:00-04:00", pointsInPlay: 16 },
  { round: "r16", label: "Round of 16", plain: "the last 16 teams", opensIso: "2026-07-04T09:00:00-04:00", locksIso: "2026-07-04T12:00:00-04:00", pointsInPlay: 16 },
  { round: "qf", label: "Quarterfinals", plain: "the last 8 teams", opensIso: "2026-07-09T09:00:00-04:00", locksIso: "2026-07-09T12:00:00-04:00", pointsInPlay: 16 },
  { round: "sf", label: "Semifinals", plain: "the last 4 teams", opensIso: "2026-07-14T09:00:00-04:00", locksIso: "2026-07-14T12:00:00-04:00", pointsInPlay: 16 },
  { round: "final", label: "The Final", plain: "the last match", opensIso: "2026-07-17T09:00:00-04:00", locksIso: "2026-07-19T15:00:00-04:00", pointsInPlay: 16 },
];

/** Total points available in the Bonus Picks (Golden Ball 12 + Boot 12 + Glove 8 + Dark Horse 12). */
export const BONUS_POINTS_AVAILABLE = 44;

export type PickStatus =
  | { state: "bonus-open"; pointsAvailable: number; closesIso: string }
  | { state: "round-open"; round: LiveRound }
  | { state: "round-soon"; round: LiveRound }
  | { state: "done" };

/** What can a member do right now? Drives the status bar, hub, and home screen. */
export function pickStatus(now: Date, lockTime: string): PickStatus {
  const t = now.getTime();
  // Pre-kickoff: the Bonus Picks are the open action.
  if (t < new Date(lockTime).getTime()) {
    return { state: "bonus-open", pointsAvailable: BONUS_POINTS_AVAILABLE, closesIso: lockTime };
  }
  // A knockout round currently open for picks?
  const open = LIVE_ROUNDS.find(
    (r) => new Date(r.opensIso).getTime() <= t && t < new Date(r.locksIso).getTime(),
  );
  if (open) return { state: "round-open", round: open };
  // The next round opening?
  const soon = LIVE_ROUNDS.find((r) => new Date(r.opensIso).getTime() > t);
  if (soon) return { state: "round-soon", round: soon };
  return { state: "done" };
}

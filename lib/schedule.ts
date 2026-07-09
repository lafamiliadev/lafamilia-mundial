// Scoring milestones — the moments points land on the leaderboard, used to fuel
// anticipation ("next points drop"). Dates follow the official FIFA World Cup
// 2026 schedule (group stage Jun 11–27; final Jul 19). These are fixed, public
// fixtures — the countdown just teases when the board will move next.

export type ScoringMilestone = {
  /** Short label for the banner. */
  label: string;
  /** Plain-language "what happens at zero" for someone new to soccer/fantasy. */
  whenLabel: string;
  /** Which of the member's picks get scored here. */
  fromPicks: string;
  /** When the points become live (ISO, with timezone). */
  dateIso: string;
  /** How many points are in play at this milestone (across all 12 groups, etc.). */
  pointsInPlay: number;
};

export const SCORING_MILESTONES: ScoringMilestone[] = [
  // Group winners are decided when the group stage finishes.
  { label: "Group stage finishes", whenLabel: "When the group stage ends", fromPicks: "your group-winner picks", dateIso: "2026-06-27T23:59:00-04:00", pointsInPlay: 36 },
  // Your Final Four is locked once the quarterfinals are played.
  { label: "Final Four is set", whenLabel: "When the quarterfinals finish", fromPicks: "your Final Four picks", dateIso: "2026-07-11T23:59:00-04:00", pointsInPlay: 40 },
  // Champion (and the goals tiebreaker) resolves at the final.
  { label: "The Final", whenLabel: "When the final is played", fromPicks: "your champion pick", dateIso: "2026-07-19T23:59:00-04:00", pointsInPlay: 20 },
];

/** The next milestone strictly after `now`, or null if the tournament is done. */
/**
 * Friendly relative phrase for when predictions lock — "in 4 days", "tomorrow",
 * "today", "in under an hour". Built for awareness, not a ticking clock: used on
 * the shared recipient page and the share screen to make the game feel live
 * without applying pressure. Caller decides the locked case (msUntilLock <= 0).
 */
export function relativeLockLabel(msUntilLock: number): string {
  const DAY = 86_400_000;
  if (msUntilLock <= 0) return "now";
  if (msUntilLock < 3_600_000) return "in under an hour";
  if (msUntilLock < DAY) return "today";
  if (msUntilLock < 2 * DAY) return "tomorrow";
  return `in ${Math.ceil(msUntilLock / DAY)} days`;
}

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
import type { BonusPicks, KnockoutRound, LiveMatch, ScoringWeights } from "./types";

export type LiveRound = {
  round: KnockoutRound;
  label: string; // "Round of 32"
  plain: string; // plain-language label
  opensIso: string;
  locksIso: string;
  pointsInPlay: number;
};

export const LIVE_ROUNDS: LiveRound[] = [
  // Locks at the first R32 kickoff — South Africa v Canada, 3:00pm ET / 12:00pm PT
  // (19:00 UTC) at SoFi Stadium — so people can pick right up until the round starts.
  { round: "r32", label: "Round of 32", plain: "the last 32 teams", opensIso: "2026-06-28T09:00:00-04:00", locksIso: "2026-06-28T15:00:00-04:00", pointsInPlay: 16 },
  { round: "r16", label: "Round of 16", plain: "the last 16 teams", opensIso: "2026-07-04T09:00:00-04:00", locksIso: "2026-07-04T12:00:00-04:00", pointsInPlay: 16 },
  { round: "qf", label: "Quarterfinals", plain: "the last 8 teams", opensIso: "2026-07-09T09:00:00-04:00", locksIso: "2026-07-09T12:00:00-04:00", pointsInPlay: 16 },
  { round: "sf", label: "Semifinals", plain: "the last 4 teams", opensIso: "2026-07-14T09:00:00-04:00", locksIso: "2026-07-14T12:00:00-04:00", pointsInPlay: 16 },
  { round: "final", label: "The Final", plain: "the last match", opensIso: "2026-07-17T09:00:00-04:00", locksIso: "2026-07-19T15:00:00-04:00", pointsInPlay: 16 },
];

/** Total points available in the Bonus Picks (Golden Ball 12 + Boot 12 + Glove 8 + Dark Horse 12). */
export const BONUS_POINTS_AVAILABLE = 44;

/** Points still on the table for a member — the value of the Bonus Picks they
 * haven't made yet (Dark Horse counted at its max, the SF value). */
export function bonusPointsRemaining(
  bonus: BonusPicks | null,
  w: ScoringWeights,
): number {
  // `?? 0` guards against an old settings row missing these weights (would
  // otherwise produce NaN). getSettings also merges defaults — this is a backstop.
  let pts = 0;
  if (!bonus?.goldenBall) pts += w.goldenBall ?? 0;
  if (!bonus?.goldenBoot) pts += w.goldenBoot ?? 0;
  if (!bonus?.goldenGlove) pts += w.goldenGlove ?? 0;
  if (!bonus?.darkHorse) pts += w.darkHorseSf ?? 0;
  return pts;
}

export type PickStatus =
  | { state: "bonus-open"; pointsAvailable: number; closesIso: string }
  | { state: "round-open"; round: LiveRound }
  | { state: "round-soon"; round: LiveRound }
  | { state: "done" };

/**
 * What can a member do right now? Drives the status bar, hub, and home screen.
 * When the drawn matchups are supplied, a round counts as OPEN while any of its
 * games hasn't kicked off (the per-game lock the pick screen and save action
 * enforce) — a round spans several days, so the printed open/lock windows can't
 * be trusted once its first game has started. The windows remain the fallback
 * for rounds whose matchups aren't drawn yet.
 */
export function pickStatus(now: Date, lockTime: string, liveMatches: LiveMatch[] = []): PickStatus {
  const t = now.getTime();
  // Pre-kickoff: the Bonus Picks are the open action.
  if (t < new Date(lockTime).getTime()) {
    return { state: "bonus-open", pointsAvailable: BONUS_POINTS_AVAILABLE, closesIso: lockTime };
  }
  // Per-game truth first: the earliest round with a game still open to pick.
  // (Mirrors liveMatchOpen — a missing/invalid kickoff never counts as open.)
  const gameOpen = (m: LiveMatch) => {
    if (!m.kickoffIso) return false;
    const k = new Date(m.kickoffIso).getTime();
    return !Number.isNaN(k) && t < k;
  };
  for (const r of LIVE_ROUNDS) {
    if (liveMatches.some((m) => m.round === r.round && gameOpen(m))) {
      return { state: "round-open", round: r };
    }
  }
  // A knockout round inside its scheduled window (matchups not drawn yet)?
  const open = LIVE_ROUNDS.find(
    (r) => new Date(r.opensIso).getTime() <= t && t < new Date(r.locksIso).getTime(),
  );
  if (open) return { state: "round-open", round: open };
  // The next round opening?
  const soon = LIVE_ROUNDS.find((r) => new Date(r.opensIso).getTime() > t);
  if (soon) return { state: "round-soon", round: soon };
  return { state: "done" };
}

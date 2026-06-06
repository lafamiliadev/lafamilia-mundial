// Live Picks (Phase 2) domain helpers — pure functions shared by the player
// pick screen, the admin entry, scoring, and the leaderboard. No I/O here so
// they stay trivially unit-testable.

import { LIVE_ROUNDS, type LiveRound } from "./schedule";
import { LIVE_ROUND_POINTS, type KnockoutRound, type LiveMatch, type LivePick, type ScoringWeights } from "./types";

/** How many matches each knockout round has — drives the admin entry grid. */
export const ROUND_MATCH_COUNT: Record<KnockoutRound, number> = {
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  final: 1,
};

/** The schedule entry (open/lock dates, labels, points) for a round. */
export function liveRound(round: KnockoutRound): LiveRound | undefined {
  return LIVE_ROUNDS.find((r) => r.round === round);
}

/** A stable match id for a round + position, e.g. "r32-1". */
export function matchId(round: KnockoutRound, index: number): string {
  return `${round}-${index + 1}`;
}

/** The cached matchups for one round, in entry order. */
export function matchesForRound(matches: LiveMatch[], round: KnockoutRound): LiveMatch[] {
  return matches
    .filter((m) => m.round === round)
    .sort((a, b) => a.matchId.localeCompare(b.matchId, undefined, { numeric: true }));
}

export type RoundState = "upcoming" | "open" | "locked" | "scored";

/** Where a round sits relative to `now` and whether its results are in. */
export function roundState(
  round: LiveRound,
  nowMs: number,
  matchWinners: Record<string, string>,
  matches: LiveMatch[],
): RoundState {
  const roundMatches = matchesForRound(matches, round.round);
  const allScored =
    roundMatches.length > 0 && roundMatches.every((m) => matchWinners[m.matchId]);
  if (allScored) return "scored";
  if (nowMs < new Date(round.opensIso).getTime()) return "upcoming";
  if (nowMs < new Date(round.locksIso).getTime()) return "open";
  return "locked";
}

export type RawLivePick = { matchId: string; team: string; highConviction?: boolean };

/**
 * Validate a member's submitted picks against the round's real matchups:
 * every pick must reference a match in this round, the chosen team must be one
 * of that match's two sides, and at most one pick can be High Conviction.
 * Returns clean `LivePick[]` or a human-readable error.
 */
export function sanitizeLivePicks(
  round: KnockoutRound,
  roundMatches: LiveMatch[],
  rawPicks: RawLivePick[],
): { ok: true; picks: LivePick[] } | { ok: false; error: string } {
  const byId = new Map(roundMatches.map((m) => [m.matchId, m]));
  const seen = new Set<string>();
  const picks: LivePick[] = [];
  let hc = 0;
  for (const rp of rawPicks) {
    const m = byId.get(rp.matchId);
    if (!m) return { ok: false, error: "That match isn't in this round." };
    if (seen.has(rp.matchId)) return { ok: false, error: "Duplicate pick for a match." };
    seen.add(rp.matchId);
    if (rp.team !== m.homeCode && rp.team !== m.awayCode) {
      return { ok: false, error: "Pick one of the two teams in the match." };
    }
    const high = Boolean(rp.highConviction);
    if (high) hc += 1;
    picks.push({ matchId: rp.matchId, round, team: rp.team, highConviction: high });
  }
  if (hc > 1) return { ok: false, error: "Only one ⚡ Double Down per round." };
  return { ok: true, picks };
}

/** What confirming one side of a match would do to the board — drives the
 * admin "before you save" preview so nothing is a surprise. */
export type SideImpact = {
  /** How many members picked this team for this match. */
  players: number;
  /** Total points that would be awarded if this team is confirmed. */
  points: number;
  /** How many of those picks are ⚡ Double Down. */
  conviction: number;
};

export type MatchImpact = {
  match: LiveMatch;
  /** The currently recorded winner for this match, or null (not scored yet). */
  scoredWinner: string | null;
  home: SideImpact;
  away: SideImpact;
  /** Members who picked either side of this match. */
  totalPickers: number;
};

/**
 * Compute, for a single match, how many members picked each team and how many
 * points each outcome would award (⚡ doubles). Pure — pass the FULL flattened
 * list of everyone's live picks. Used to preview impact before confirming.
 */
export function matchImpact(
  match: LiveMatch,
  allPicks: LivePick[],
  weights: ScoringWeights,
  matchWinners: Record<string, string>,
): MatchImpact {
  const base = weights[LIVE_ROUND_POINTS[match.round]];
  const side = (team: string): SideImpact => {
    let players = 0;
    let points = 0;
    let conviction = 0;
    for (const p of allPicks) {
      if (p.matchId !== match.matchId || p.team !== team) continue;
      players += 1;
      points += p.highConviction ? base * 2 : base;
      if (p.highConviction) conviction += 1;
    }
    return { players, points, conviction };
  };
  const home = side(match.homeCode);
  const away = side(match.awayCode);
  return {
    match,
    scoredWinner: matchWinners[match.matchId] ?? null,
    home,
    away,
    totalPickers: home.players + away.players,
  };
}

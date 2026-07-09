// Live Picks (Phase 2) domain helpers — pure functions shared by the player
// pick screen, the admin entry, scoring, and the leaderboard. No I/O here so
// they stay trivially unit-testable.

import { LIVE_ROUNDS, type LiveRound } from "./schedule";
import {
  KNOCKOUT_ROUNDS,
  LIVE_ROUND_POINTS,
  type KnockoutRound,
  type LiveMatch,
  type LivePick,
  type ScoringWeights,
} from "./types";

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

/**
 * Per-GAME lock, mirroring the score-prediction flow: a knockout match is open
 * until its own kickoff, then locked. A missing/invalid kickoff is treated as
 * locked so the server never accepts a pick it can't verify against a clock.
 */
export function liveMatchOpen(m: { kickoffIso: string | null }, nowMs: number): boolean {
  if (!m.kickoffIso) return false;
  const k = new Date(m.kickoffIso).getTime();
  return !Number.isNaN(k) && nowMs < k;
}

export type LiveRoundView = {
  round: KnockoutRound;
  matches: LiveMatch[];
  /** True when at least one game in the round is still pickable (not started). */
  hasOpenGames: boolean;
};

/**
 * The knockout round to show on the pick screen. With per-game locks the
 * relevant round is the earliest one that still has an open (not-yet-started)
 * game; if none are open, the most advanced round with matchups, so members can
 * still review their locked picks and results. Returns null when no knockout
 * matchups have been drawn yet.
 */
export function currentLiveRoundView(matches: LiveMatch[], nowMs: number): LiveRoundView | null {
  const drawn = KNOCKOUT_ROUNDS.map((round) => ({
    round,
    matches: matchesForRound(matches, round),
  })).filter((r) => r.matches.length > 0);
  if (drawn.length === 0) return null;
  const withOpen = drawn.find((r) => r.matches.some((m) => liveMatchOpen(m, nowMs)));
  if (withOpen) return { round: withOpen.round, matches: withOpen.matches, hasOpenGames: true };
  const last = drawn[drawn.length - 1];
  return { round: last.round, matches: last.matches, hasOpenGames: false };
}

/**
 * Merge freshly submitted round picks over a member's existing ones, ONE GAME
 * AT A TIME: games they didn't submit keep their saved pick (so locked and
 * untouched games are never disturbed), submitted games are replaced. Enforces
 * the single ⚡ Double Down across the whole round. Pure — the per-game lock is
 * enforced in the action before this runs, so only unlocked games reach here.
 */
export function mergeRoundPicks(
  existingRound: LivePick[],
  submitted: LivePick[],
): { ok: true; picks: LivePick[] } | { ok: false; error: string } {
  const submittedIds = new Set(submitted.map((p) => p.matchId));
  const merged = [...existingRound.filter((p) => !submittedIds.has(p.matchId)), ...submitted];
  if (merged.filter((p) => p.highConviction).length > 1) {
    return { ok: false, error: "Only one ⚡ Double Down per round." };
  }
  return { ok: true, picks: merged };
}

export type LiveMatchReconciliation = {
  /** The list to store: provider entries (canonical ids + kickoffs) plus any
   * stored matchups the provider doesn't return yet (manual/back-filled). */
  matches: LiveMatch[];
  /** stored matchId → provider matchId — the caller migrates saved picks and
   * recorded winners across so nothing orphans on the id change. */
  renames: Record<string, string>;
};

/** Same game = same round + same two teams, either orientation. */
function pairKey(m: LiveMatch): string {
  return `${m.round}:${[m.homeCode, m.awayCode].sort().join("-")}`;
}

/**
 * Reconcile a fresh provider matchup list with the stored one. The provider is
 * canonical for ids and kickoffs, but a blind replace has two failure modes
 * this prevents: (1) a matchup entered before the provider knew the game
 * (admin manual entry, or a back-fill while the API was down) would vanish —
 * taking its pick cards with it; and (2) when the provider later returns that
 * same game under its own id, every pick saved against the old id would stop
 * counting. Games are paired by round + teams; stored-only entries are kept,
 * and id changes are reported as renames.
 */
export function reconcileLiveMatches(
  stored: LiveMatch[],
  fresh: LiveMatch[],
): LiveMatchReconciliation {
  const freshByKey = new Map(fresh.map((m) => [pairKey(m), m]));
  const renames: Record<string, string> = {};
  const keep: LiveMatch[] = [];
  for (const s of stored) {
    const f = freshByKey.get(pairKey(s));
    if (!f) keep.push(s);
    else if (f.matchId !== s.matchId) renames[s.matchId] = f.matchId;
  }
  return { matches: [...fresh, ...keep], renames };
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

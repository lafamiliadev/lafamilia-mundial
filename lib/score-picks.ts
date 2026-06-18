// Single source of truth for Bonus Score Picks.
//
// Rule: EVERY bonus pick is open from the moment it exists until its own
// kickoff. Each game LOCKS at kickoff — independently. There is no "window
// opens" step anymore: people can predict any game whenever they want, and a
// pick simply locks when that game starts. Pure + UTC-based (kickoffUtc is an
// ISO timestamp), so the math is identical on the server, the cron, and every
// page — and unit-testable.

import type { ScoreMatch } from "./types";

export type ScorePickState =
  | "open" // predictable now — before kickoff
  | "closed"; // kicked off — locked

function kickoffMs(m: { kickoffUtc: string }): number {
  return new Date(m.kickoffUtc).getTime();
}

/** Open until kickoff, then locked. Every game is open from the start. */
export function scorePickState(m: { kickoffUtc: string }, nowMs: number): ScorePickState {
  const k = kickoffMs(m);
  if (Number.isNaN(k) || nowMs >= k) return "closed";
  return "open";
}

export function isScorePickOpen(m: { kickoffUtc: string }, nowMs: number): boolean {
  return scorePickState(m, nowMs) === "open";
}

/** Every match still open (not yet kicked off), soonest kickoff first — so the
 * predict screen always leads with what locks next. */
export function openScoreMatches(matches: ScoreMatch[], nowMs: number): ScoreMatch[] {
  return matches
    .filter((m) => scorePickState(m, nowMs) === "open")
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
}

/** The next open match the viewer hasn't predicted yet — drives the "predict
 * now" nudge. Returns null once they've handled every open game. */
export function nextOpenUnpredicted(
  matches: ScoreMatch[],
  nowMs: number,
  predictedIds: Set<string>,
): ScoreMatch | null {
  return openScoreMatches(matches, nowMs).find((m) => !predictedIds.has(m.matchId)) ?? null;
}

// ── "Locking soon" reminder selection (replaces the old per-window email) ──

/** Horizon for the daily "locking soon" nudge: games whose kickoff is within
 * the next 30h. 30 (not 24) so a once-a-day cron never misses a game between
 * runs. */
export const LOCKING_SOON_MS = 30 * 60 * 60 * 1000;

/** Open matches that LOCK within `withinMs` (kickoff between now and now+withinMs),
 * soonest first. Drives the daily "these lock soon" reminder. */
export function lockingSoonMatches(
  matches: ScoreMatch[],
  nowMs: number,
  withinMs: number = LOCKING_SOON_MS,
): ScoreMatch[] {
  return matches
    .filter((m) => {
      const k = kickoffMs(m);
      return !Number.isNaN(k) && nowMs < k && k - nowMs <= withinMs;
    })
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
}

/** The PT calendar date (YYYY-MM-DD) for a moment — the per-day idempotency key
 * for the nudge, so each member gets at most one "locking soon" email per day. */
export function ptDateOf(nowMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

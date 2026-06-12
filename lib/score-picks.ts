// Single source of truth for the Bonus Score Pick window.
//
// Rule: a Bonus Score Pick OPENS exactly 24 hours before kickoff and CLOSES at
// kickoff. Pure + UTC-based (kickoffUtc is an ISO timestamp), so the window math
// is identical on the server, the cron, and every page — and unit-testable.

import type { ScoreMatch } from "./types";

/** The prediction window length: opens 24h before kickoff. */
export const SCORE_PICK_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ScorePickState =
  | "open" // within [kickoff − 24h, kickoff) — predictable now
  | "upcoming" // window hasn't opened yet
  | "closed"; // kicked off — locked

function kickoffMs(m: { kickoffUtc: string }): number {
  return new Date(m.kickoffUtc).getTime();
}

/** When this match's 24h prediction window opens (ms epoch). */
export function windowOpensAtMs(m: { kickoffUtc: string }): number {
  return kickoffMs(m) - SCORE_PICK_WINDOW_MS;
}

/** Open (predict now) / upcoming (not yet) / closed (kicked off). */
export function scorePickState(m: { kickoffUtc: string }, nowMs: number): ScorePickState {
  const k = kickoffMs(m);
  if (Number.isNaN(k)) return "closed";
  if (nowMs >= k) return "closed";
  if (nowMs >= k - SCORE_PICK_WINDOW_MS) return "open";
  return "upcoming";
}

export function isScorePickOpen(m: { kickoffUtc: string }, nowMs: number): boolean {
  return scorePickState(m, nowMs) === "open";
}

/** Matches currently in their open window, soonest kickoff first. */
export function openScoreMatches(matches: ScoreMatch[], nowMs: number): ScoreMatch[] {
  return matches
    .filter((m) => scorePickState(m, nowMs) === "open")
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
}

/** The soonest match whose window hasn't opened yet — for the "coming soon"
 * countdown. */
export function nextUpcomingScoreMatch(matches: ScoreMatch[], nowMs: number): ScoreMatch | null {
  return (
    matches
      .filter((m) => scorePickState(m, nowMs) === "upcoming")
      .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))[0] ?? null
  );
}

/** The next OPEN match the viewer hasn't predicted yet — drives the "earn points
 * now" card. Returns null once they've handled every currently-open match. */
export function nextOpenUnpredicted(
  matches: ScoreMatch[],
  nowMs: number,
  predictedIds: Set<string>,
): ScoreMatch | null {
  return openScoreMatches(matches, nowMs).find((m) => !predictedIds.has(m.matchId)) ?? null;
}

/** A window-open email is "due" for a match only while the window is open AND
 * it opened recently (so the hourly cron emails when it FRESHLY opens, never a
 * catch-up blast for windows that opened long ago). Idempotency is enforced
 * separately by the email log. */
export const SCORE_WINDOW_EMAIL_FRESH_MS = 6 * 60 * 60 * 1000;
export function scoreWindowEmailDue(m: { kickoffUtc: string }, nowMs: number): boolean {
  return (
    scorePickState(m, nowMs) === "open" &&
    nowMs - windowOpensAtMs(m) <= SCORE_WINDOW_EMAIL_FRESH_MS
  );
}

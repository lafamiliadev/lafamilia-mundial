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

/** When this match's DAY unlocks for predictions: the EARLIEST window-open among
 * all matches that open on the same PT day. Same-day games unlock together — the
 * moment the first one's 24h window opens — and each still closes at its own
 * kickoff. (Single-match days unlock at their own 24h window, as before.) */
export function dayUnlockAtMs(
  m: { kickoffUtc: string },
  allMatches: { kickoffUtc: string }[],
): number {
  const day = windowOpenPtDate(m);
  const opens = allMatches
    .filter((x) => windowOpenPtDate(x) === day)
    .map((x) => windowOpensAtMs(x));
  return opens.length ? Math.min(...opens) : windowOpensAtMs(m);
}

/** Open (predict now) / upcoming (not yet) / closed (kicked off). A match is
 * OPEN once its DAY has unlocked, so two same-day games become predictable at
 * the same time — when the first one's window opens. Needs the full match list
 * to find same-day siblings. */
export function scorePickState(
  m: ScoreMatch,
  allMatches: ScoreMatch[],
  nowMs: number,
): ScorePickState {
  const k = kickoffMs(m);
  if (Number.isNaN(k)) return "closed";
  if (nowMs >= k) return "closed";
  if (nowMs >= dayUnlockAtMs(m, allMatches)) return "open";
  return "upcoming";
}

export function isScorePickOpen(m: ScoreMatch, allMatches: ScoreMatch[], nowMs: number): boolean {
  return scorePickState(m, allMatches, nowMs) === "open";
}

/** Matches predictable right now (their day has unlocked), soonest kickoff first. */
export function openScoreMatches(matches: ScoreMatch[], nowMs: number): ScoreMatch[] {
  return matches
    .filter((m) => scorePickState(m, matches, nowMs) === "open")
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
}

/** The soonest match whose day hasn't unlocked yet — for the "coming soon"
 * countdown (count to dayUnlockAtMs of this match). */
export function nextUpcomingScoreMatch(matches: ScoreMatch[], nowMs: number): ScoreMatch | null {
  return (
    matches
      .filter((m) => scorePickState(m, matches, nowMs) === "upcoming")
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

/** Freshness window for the daily reminder email, anchored to the day's first
 * window opening — keeps the cron from catch-up-blasting an older day. */
export const SCORE_WINDOW_EMAIL_FRESH_MS = 6 * 60 * 60 * 1000;

// ── Daily grouping: one email per user per day, all that day's open windows ──

/** The PT calendar date (YYYY-MM-DD) on which this match's window opens. Matches
 * that open on the same PT day are grouped into a single daily email. */
export function windowOpenPtDate(m: { kickoffUtc: string }): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(windowOpensAtMs(m)));
}

export type ScoreDayGroup = { ptDate: string; matches: ScoreMatch[] };

/** Day-groups whose grouped email is DUE now: the group's EARLIEST window has
 * opened within the freshness window — so it fires once, shortly after the day's
 * first window opens, and never as a catch-up blast for an older day. Matches
 * are returned in kickoff order. */
export function dueScoreDayGroups(matches: ScoreMatch[], nowMs: number): ScoreDayGroup[] {
  const byDate = new Map<string, ScoreMatch[]>();
  for (const m of matches) {
    const d = windowOpenPtDate(m);
    const arr = byDate.get(d) ?? [];
    arr.push(m);
    byDate.set(d, arr);
  }
  const groups: ScoreDayGroup[] = [];
  for (const [ptDate, ms] of byDate) {
    const sorted = ms.slice().sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
    const earliestOpen = Math.min(...sorted.map((m) => windowOpensAtMs(m)));
    if (nowMs >= earliestOpen && nowMs - earliestOpen <= SCORE_WINDOW_EMAIL_FRESH_MS) {
      groups.push({ ptDate, matches: sorted });
    }
  }
  return groups.sort((a, b) => a.ptDate.localeCompare(b.ptDate));
}

export type ScoreDayEmailRecipient = { participantId: string; remaining: ScoreMatch[] };
export type ScoreDayEmailPlan = { ptDate: string; templateId: string; recipients: ScoreDayEmailRecipient[] };

/**
 * Pure recipient planner for the daily grouped email — the heart of the QA
 * rules. For each due day-group, each participant gets at most ONE email
 * (idempotent via the per-day template log), focused on the matches in that
 * group they HAVEN'T predicted. Anyone who has predicted them all is skipped.
 */
export function planScoreDayEmails(
  groups: ScoreDayGroup[],
  participantIds: string[],
  /** matchId → set of participant ids who already predicted it. */
  predictorsByMatch: Record<string, Set<string>>,
  /** templateId → set of participant ids already emailed for that day-group. */
  alreadyEmailedByTemplate: Record<string, Set<string>>,
  templateIdFor: (ptDate: string) => string,
): ScoreDayEmailPlan[] {
  return groups.map((g) => {
    const templateId = templateIdFor(g.ptDate);
    const already = alreadyEmailedByTemplate[templateId] ?? new Set<string>();
    const recipients: ScoreDayEmailRecipient[] = [];
    for (const pid of participantIds) {
      if (already.has(pid)) continue; // idempotent — already got today's email
      const remaining = g.matches.filter((m) => !(predictorsByMatch[m.matchId] ?? new Set()).has(pid));
      if (remaining.length === 0) continue; // predicted everything today → skip
      recipients.push({ participantId: pid, remaining });
    }
    return { ptDate: g.ptDate, templateId, recipients };
  });
}

// Auto-create LatAm + Spain score-pick matches from the provider's fixture
// list, so people can keep earning score-prediction points through the
// knockouts without any manual admin step. Pure + deterministic: the I/O
// wrapper lives in services.ts (syncScorePickMatches); everything here is
// testable from plain data.

import type { ProviderScore } from "./football";
import { TEAM_BY_CODE } from "./teams";
import type { ScoreMatch } from "./types";

const SPAIN = "ESP";

/** A team makes a fixture eligible for score picks if it's a LatAm side or
 * Spain — the same set the group-stage matches were seeded from. */
export function isScorePickEligible(code: string | null | undefined): boolean {
  if (!code) return false;
  return Boolean(TEAM_BY_CODE[code]?.isLatam) || code === SPAIN;
}

function teamName(code: string): string {
  return TEAM_BY_CODE[code]?.name ?? code;
}

/** "June 11, 2026, 3:00 p.m. ET" — matches the seeded matches' display format. */
function displayTime(iso: string, timeZone: string, suffix: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const ap = get("dayPeriod").toLowerCase() === "pm" ? "p.m." : "a.m.";
  return `${get("month")} ${get("day")}, ${get("year")}, ${get("hour")}:${get("minute")} ${ap} ${suffix}`;
}

/** YYYY_MM_DD in US Eastern — the seeded match-id date convention. */
function etDateStamp(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}_${get("month")}_${get("day")}`;
}

/** Build a fresh score match. Pass the provider fixture id when there is one —
 * pre-linking means the existing auto-scoring flow scores it with no extra
 * step. Bracket-derived matches (no provider) pass null and are scored by the
 * admin, exactly like a manual entry. */
export function buildScoreMatch(f: {
  fixtureId: string | null;
  kickoffIso: string;
  homeCode: string;
  awayCode: string;
}): ScoreMatch {
  const eligibleNames = [f.homeCode, f.awayCode].filter(isScorePickEligible).map(teamName);
  return {
    matchId: `${f.homeCode}_${f.awayCode}_${etDateStamp(f.kickoffIso)}`,
    teamA: teamName(f.homeCode),
    teamB: teamName(f.awayCode),
    eligibleTeam: eligibleNames.join(", "),
    kickoffUtc: f.kickoffIso,
    displayTimeEt: displayTime(f.kickoffIso, "America/New_York", "ET"),
    displayTimePt: displayTime(f.kickoffIso, "America/Los_Angeles", "PT"),
    finalScoreA: null,
    finalScoreB: null,
    providerFixtureId: f.fixtureId,
    scoredBy: null,
    scoredAt: null,
  };
}

/**
 * Pure selection: from the provider's fixtures, the upcoming LatAm + Spain games
 * not already tracked — ready to insert as new score matches. Only "scheduled"
 * (not-yet-played) fixtures qualify, so finished games are never re-created.
 * Dedupes against existing provider-fixture ids AND match ids (and within the
 * batch), so it's safe to run on every cron tick.
 */
export function selectNewScoreMatches(
  fixtures: ProviderScore[],
  existing: ScoreMatch[],
): ScoreMatch[] {
  const haveFixture = new Set(
    existing.map((m) => m.providerFixtureId).filter((id): id is string => Boolean(id)),
  );
  const haveMatchId = new Set(existing.map((m) => m.matchId));
  const seen = new Set<string>();
  const out: ScoreMatch[] = [];
  for (const f of fixtures) {
    if (f.status !== "scheduled") continue;
    if (!f.kickoffIso || !f.homeCode || !f.awayCode) continue;
    if (haveFixture.has(f.fixtureId)) continue;
    if (!isScorePickEligible(f.homeCode) && !isScorePickEligible(f.awayCode)) continue;
    const m = buildScoreMatch({
      fixtureId: f.fixtureId,
      kickoffIso: f.kickoffIso,
      homeCode: f.homeCode,
      awayCode: f.awayCode,
    });
    if (haveMatchId.has(m.matchId) || seen.has(m.matchId)) continue;
    seen.add(m.matchId);
    out.push(m);
  }
  return out;
}

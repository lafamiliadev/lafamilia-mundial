// Pure helpers for linking bonus score-prediction matches to provider fixtures
// and orienting the provider's score onto our team_a/team_b ordering. No I/O and
// no server-only deps, so the matching + orientation rules (the parts that must
// never mis-score) are exhaustively unit-testable.

import { resolveTeamCode } from "./teams";
import type { ProviderScore } from "./football/provider";

/** Normalize any ISO timestamp to its UTC calendar day (YYYY-MM-DD), or null. */
export function utcDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/** A team-pair + UTC-day key used to match a seeded match to a provider fixture.
 * Team codes are order-independent (sorted); the day disambiguates rematches. */
export function scoreMatchKey(
  codeA: string,
  codeB: string,
  iso: string | null | undefined,
): string | null {
  const day = utcDay(iso);
  return day ? `${[codeA, codeB].sort().join("|")}|${day}` : null;
}

/**
 * Orient a provider's home/away final score onto our team_a/team_b ordering.
 * Returns null unless the match is FINAL, both goal counts are present, and both
 * teams resolve to the same codes (in either home/away order). Never guesses —
 * an unresolved or mismatched fixture yields null so the admin scores by hand.
 */
export function orientApiScore(
  match: { teamA: string; teamB: string },
  api: ProviderScore,
): { a: number; b: number } | null {
  if (api.status !== "final" || api.homeGoals == null || api.awayGoals == null) return null;
  const codeA = resolveTeamCode(match.teamA);
  const codeB = resolveTeamCode(match.teamB);
  if (!codeA || !codeB) return null;
  if (api.homeCode === codeA && api.awayCode === codeB) {
    return { a: api.homeGoals, b: api.awayGoals };
  }
  if (api.homeCode === codeB && api.awayCode === codeA) {
    return { a: api.awayGoals, b: api.homeGoals };
  }
  return null;
}

import type { GroupMap, LiveMatch, Results } from "../types";

// Swappable football-data abstraction. The scoring cron depends ONLY on this
// interface, so swapping providers is a one-line env change.

export type ProviderStatus = {
  provider: string;
  ok: boolean;
  detail: string;
  fetchedAt: string;
};

/** Normalized lifecycle of a single fixture, mapped from the provider's status
 * codes. Drives the admin score-match panel (scheduled → live → final). */
export type ProviderMatchStatus =
  | "scheduled"
  | "live"
  | "final"
  | "postponed"
  | "canceled";

/** A single fixture's score + status from the provider, team-resolved to our
 * codes. `homeGoals`/`awayGoals` are only meaningful when status is "final"
 * (and even then may be null if the provider hasn't filled them yet). */
export type ProviderScore = {
  /** Stable provider fixture id, as a string (e.g. API-Football numeric id). */
  fixtureId: string;
  status: ProviderMatchStatus;
  kickoffIso: string | null;
  homeCode: string | null;
  awayCode: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
};

export interface FootballProvider {
  readonly name: string;
  /** Health/quota check shown on the admin "API status" panel. */
  status(): Promise<ProviderStatus>;
  /**
   * Group composition (group letter A–L → 4 team codes), the source of truth for
   * the prediction wizard. Pulled from the provider and cached in settings;
   * returns {} if not yet available.
   */
  fetchGroups(): Promise<GroupMap>;
  /**
   * Pull the current authoritative tournament results (champion, group winners,
   * per-stage team lists). Returns only what's known so far; the scoring engine
   * handles the rest.
   */
  fetchResults(): Promise<Results>;
  /**
   * Knockout matchups (who plays whom each round) with stable match ids, so the
   * Live Picks pick cards populate automatically. Returns [] when the provider
   * has no knockout data yet (or doesn't support it).
   */
  fetchKnockoutMatches(): Promise<LiveMatch[]>;
  /**
   * Final scores + live status for every fixture (group stage included), so the
   * bonus score-prediction matches can be scored from the provider. Returns []
   * when the provider has no per-match score data (or doesn't support it).
   */
  fetchScores(): Promise<ProviderScore[]>;
}

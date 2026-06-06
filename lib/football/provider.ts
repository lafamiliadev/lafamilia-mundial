import type { GroupMap, LiveMatch, Results } from "../types";

// Swappable football-data abstraction. The scoring cron depends ONLY on this
// interface, so swapping providers is a one-line env change.

export type ProviderStatus = {
  provider: string;
  ok: boolean;
  detail: string;
  fetchedAt: string;
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
}

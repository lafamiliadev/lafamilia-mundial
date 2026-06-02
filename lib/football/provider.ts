import type { Results } from "../types";

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
   * Pull the current authoritative tournament results (champion, runner-up,
   * golden boot, per-stage team lists, etc.). Returns a partial — only what's
   * known so far. The scoring engine handles the rest.
   */
  fetchResults(): Promise<Results>;
}

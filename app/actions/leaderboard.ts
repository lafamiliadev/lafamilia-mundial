"use server";

import { getPlayerLedger, type PlayerLedger } from "@/lib/services";

/** Read-only: a player's points ledger for the leaderboard drawer. Public data
 * (derived from public picks + results), keyed by the public slug. */
export async function getPlayerLedgerAction(slug: string): Promise<PlayerLedger | null> {
  return getPlayerLedger(slug);
}

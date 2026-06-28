"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { liveMatchOpen, matchesForRound, mergeRoundPicks, sanitizeLivePicks, type RawLivePick } from "@/lib/live";
import { now } from "@/lib/preview";
import { recomputeScores } from "@/lib/services";
import { setSessionToken } from "@/lib/session";
import { KNOCKOUT_ROUNDS, type KnockoutRound } from "@/lib/types";

const schema = z.object({
  token: z.string().min(8),
  round: z.enum(KNOCKOUT_ROUNDS),
  picks: z
    .array(
      z.object({
        matchId: z.string().trim().max(20),
        team: z.string().trim().max(8),
        highConviction: z.boolean().optional(),
      }),
    )
    .max(16),
});

export type LiveSaveResult = { ok: true } | { ok: false; error: string };

/**
 * Save a member's Live Picks for one knockout round — PER GAME, mirroring score
 * predictions. The lock is each match's own kickoff (server clock, not the
 * browser): a submission for a game that has already started is rejected.
 * Submitted games are upserted; every other game — locked or simply not in this
 * payload — keeps its saved pick, so partial saves never disturb existing picks.
 * Other rounds are untouched. The single ⚡ Double Down is enforced across the
 * whole (merged) round.
 */
export async function saveLivePicks(raw: z.input<typeof schema>): Promise<LiveSaveResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, round, picks } = parsed.data;
  const r = round as KnockoutRound;
  try {
    const repo = await db();
    const settings = await repo.getSettings();

    const roundMatches = matchesForRound(settings.liveMatches, r);
    if (roundMatches.length === 0) {
      return { ok: false, error: "Matchups for this round aren't set yet. Check back soon." };
    }

    // Structure validation: every pick is a real team in a match of this round,
    // no duplicates, ≤1 ⚡ in the submission itself.
    const clean = sanitizeLivePicks(r, roundMatches, picks as RawLivePick[]);
    if (!clean.ok) return clean;

    // Backend per-game lock — the authoritative check. Reject the save if ANY
    // submitted game has already kicked off, even if the UI was bypassed.
    const nowMs = (await now()).getTime();
    const byId = new Map(roundMatches.map((m) => [m.matchId, m]));
    for (const p of clean.picks) {
      const m = byId.get(p.matchId);
      if (!m || !liveMatchOpen(m, nowMs)) {
        return { ok: false, error: "That game has already started — its pick is locked." };
      }
    }

    const me = await repo.getByToken(token);
    if (!me) return { ok: false, error: "Entry not found." };

    // Merge over existing picks one game at a time: locked games and games the
    // member didn't submit keep their saved pick; submitted games are replaced.
    const existing = await repo.getLivePicks(me.id);
    const otherRounds = existing.filter((p) => p.round !== r);
    const existingRound = existing.filter((p) => p.round === r);
    const merged = mergeRoundPicks(existingRound, clean.picks);
    if (!merged.ok) return merged;

    await repo.saveLivePicks(me.id, [...otherRounds, ...merged.picks]);

    await recomputeScores({ pullFromProvider: false }).catch(() => {});
    await setSessionToken(me.resumeToken).catch(() => {});
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

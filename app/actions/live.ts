"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { liveRound, matchesForRound, sanitizeLivePicks, type RawLivePick } from "@/lib/live";
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
 * Save a member's Live Picks for one knockout round. Picks for other rounds are
 * preserved untouched; this round's are replaced. Editable until the round's
 * first kickoff (`locksIso`), then frozen. Uses the effective clock so preview
 * QA can open/lock rounds locally without touching production.
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
    const lr = liveRound(r);
    if (!lr) return { ok: false, error: "Unknown round." };

    const nowMs = (await now()).getTime();
    if (nowMs < new Date(lr.opensIso).getTime()) {
      return { ok: false, error: "This round isn't open for picks yet." };
    }
    if (nowMs >= new Date(lr.locksIso).getTime()) {
      return { ok: false, error: "This round is locked — the matches have kicked off." };
    }

    const roundMatches = matchesForRound(settings.liveMatches, r);
    if (roundMatches.length === 0) {
      return { ok: false, error: "Matchups for this round aren't set yet. Check back soon." };
    }

    const clean = sanitizeLivePicks(r, roundMatches, picks as RawLivePick[]);
    if (!clean.ok) return clean;

    const me = await repo.getByToken(token);
    if (!me) return { ok: false, error: "Entry not found." };

    const existing = await repo.getLivePicks(me.id);
    const others = existing.filter((p) => p.round !== r);
    await repo.saveLivePicks(me.id, [...others, ...clean.picks]);

    await recomputeScores({ pullFromProvider: false }).catch(() => {});
    await setSessionToken(me.resumeToken).catch(() => {});
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

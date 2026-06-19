"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionParticipant } from "@/lib/session";
import { now } from "@/lib/preview";
import { scorePickState } from "@/lib/score-picks";
import type { ScorePrediction } from "@/lib/types";

const submitSchema = z.object({
  matchId: z.string().min(1).max(80),
  scoreA: z.number().int().min(0).max(30),
  scoreB: z.number().int().min(0).max(30),
  /** Resume token, when the predict screen was reached via a ?me=<token> link
   * (no session cookie). Falls back to the cookie session when absent. */
  token: z.string().min(1).max(200).optional(),
});

export type ScorePredictionResult =
  | { ok: true; prediction: ScorePrediction }
  | { ok: false; error: string };

/**
 * Submit or update a bonus score prediction for an eligible match.
 * Backend enforces the kickoff lock — submissions after kickoff_utc are
 * rejected even if the frontend is bypassed.
 */
export async function submitScorePrediction(
  raw: z.input<typeof submitSchema>,
): Promise<ScorePredictionResult> {
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { matchId, scoreA, scoreB, token } = parsed.data;

  try {
    const repo = await db();
    const me = token ? await repo.getByToken(token) : await getSessionParticipant();
    if (!me) return { ok: false, error: "Sign in to save a score pick." };

    const match = await repo.getScoreMatch(matchId);
    if (!match) return { ok: false, error: "Match not found." };

    // Backend lock enforcement — server clock, not browser. Every game is open
    // until its own kickoff; once it kicks off the pick is locked. Reject a save
    // after kickoff even if the UI is bypassed.
    const nowMs = (await now()).getTime();
    if (scorePickState(match, nowMs) === "closed") {
      return { ok: false, error: "This game just kicked off — your pick is locked." };
    }

    const prediction = await repo.upsertScorePrediction({
      participantId: me.id,
      matchId,
      scoreA,
      scoreB,
    });

    // Keep the predict screen's progress meter and the leaderboard Scores tab in
    // sync with the new pick.
    revalidatePath("/picks/score");
    revalidatePath("/leaderboard");

    return { ok: true, prediction };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

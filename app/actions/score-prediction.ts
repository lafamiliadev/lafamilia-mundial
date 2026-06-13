"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionParticipant } from "@/lib/session";
import { now } from "@/lib/preview";
import { scorePickState } from "@/lib/score-picks";
import type { ScorePrediction } from "@/lib/types";

const submitSchema = z.object({
  matchId: z.string().min(1).max(80),
  scoreA: z.number().int().min(0).max(30),
  scoreB: z.number().int().min(0).max(30),
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

  const { matchId, scoreA, scoreB } = parsed.data;

  try {
    const repo = await db();
    const me = await getSessionParticipant();
    if (!me) return { ok: false, error: "Sign in to save a score pick." };

    const allMatches = await repo.getScoreMatches();
    const match = allMatches.find((m) => m.matchId === matchId);
    if (!match) return { ok: false, error: "Match not found." };

    // Backend window enforcement — server clock, not browser. A match unlocks
    // when its day's first window opens (same-day games together) and closes at
    // its own kickoff. Reject anything outside that, even if the UI is bypassed.
    const nowMs = (await now()).getTime();
    const state = scorePickState(match, allMatches, nowMs);
    if (state === "closed") {
      return { ok: false, error: "Score picks are locked for this match — it's kicked off." };
    }
    if (state === "upcoming") {
      return {
        ok: false,
        error: "This match isn't open for predictions yet — today's picks unlock together.",
      };
    }

    const prediction = await repo.upsertScorePrediction({
      participantId: me.id,
      matchId,
      scoreA,
      scoreB,
    });

    return { ok: true, prediction };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

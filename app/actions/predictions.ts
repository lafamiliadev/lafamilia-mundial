"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { recomputeScores } from "@/lib/services";
import type { Predictions } from "@/lib/types";

const predictionSchema = z.object({
  name: z.string().trim().min(1, "Add your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(160),
  rootingCountry: z.string().max(8).nullable(),
  champion: z.string().max(8).nullable(),
  runnerUp: z.string().max(8).nullable(),
  goldenBoot: z.string().max(64).nullable(),
  darkHorse: z.string().max(8).nullable(),
  latamFurthest: z.string().max(8).nullable(),
  finalTotalGoals: z.number().int().min(0).max(20).nullable(),
  crewCode: z.string().trim().max(40).nullable().optional(),
  ref: z.string().trim().max(40).nullable().optional(),
});

export type SubmitResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export async function submitPredictions(
  raw: z.input<typeof predictionSchema>,
): Promise<SubmitResult> {
  const parsed = predictionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const predictions: Predictions = {
    champion: d.champion,
    runnerUp: d.runnerUp,
    goldenBoot: d.goldenBoot,
    darkHorse: d.darkHorse,
    latamFurthest: d.latamFurthest,
    finalTotalGoals: d.finalTotalGoals,
  };

  try {
    const repo = await db();
    const participant = await repo.createParticipant({
      name: d.name,
      email: d.email,
      rootingCountry: d.rootingCountry,
      crewCode: d.crewCode ?? null,
      referredBy: d.ref || null,
      predictions,
    });
    // Keep the leaderboard fresh (cheap — usually all-zero pre-tournament).
    await recomputeScores({ pullFromProvider: false }).catch(() => {});
    return { ok: true, token: participant.resumeToken };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const updateSchema = predictionSchema.partial().extend({
  token: z.string().min(8),
});

export async function updatePredictions(
  raw: z.input<typeof updateSchema>,
): Promise<SubmitResult> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, name, rootingCountry, ...rest } = parsed.data;
  try {
    const repo = await db();
    const updated = await repo.updateByToken(token, {
      name,
      rootingCountry: rootingCountry ?? undefined,
      predictions: {
        champion: rest.champion ?? undefined,
        runnerUp: rest.runnerUp ?? undefined,
        goldenBoot: rest.goldenBoot ?? undefined,
        darkHorse: rest.darkHorse ?? undefined,
        latamFurthest: rest.latamFurthest ?? undefined,
        finalTotalGoals: rest.finalTotalGoals ?? undefined,
      },
    });
    if (!updated) return { ok: false, error: "Entry not found." };
    await recomputeScores({ pullFromProvider: false }).catch(() => {});
    return { ok: true, token: updated.resumeToken };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

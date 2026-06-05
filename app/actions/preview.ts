"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { recomputeScores } from "@/lib/services";
import { PREVIEW_ENABLED } from "@/lib/preview";
import { PREVIEW_COOKIE, previewStage } from "@/lib/preview-stages";
import type { PreviewStageKey } from "@/lib/preview-stages";
import { EMPTY_RESULTS, type Results } from "@/lib/types";

// A plausible deep run, reused across the scored stages.
const FINAL_FOUR = ["BRA", "FRA", "ESP", "ARG"];
const DARK_HORSES = ["MEX", "COL"]; // demo members' dark-horse picks reach a stage
const CHAMP = "ARG";

/** Build the results a given stage implies (dev store only). */
function resultsForStage(key: PreviewStageKey, groups: Record<string, string[]>): Results {
  // Each group's winner = its first listed team (deterministic; good enough to
  // light up the leaderboard with a realistic mix of right/wrong picks).
  const groupWinners: Record<string, string> = {};
  for (const [letter, codes] of Object.entries(groups)) {
    if (codes?.[0]) groupWinners[letter] = codes[0];
  }

  if (key === "pre" || key === "kickoff") return EMPTY_RESULTS;

  if (key === "groups") {
    return { ...EMPTY_RESULTS, groupWinners };
  }

  if (key === "finalfour") {
    return {
      ...EMPTY_RESULTS,
      groupWinners,
      stageReached: { qf: [...FINAL_FOUR, ...DARK_HORSES], sf: FINAL_FOUR },
    };
  }

  // champion — the whole bracket resolved
  return {
    ...EMPTY_RESULTS,
    groupWinners,
    champion: CHAMP,
    goldenBall: "messi",
    goldenBoot: "mbappe",
    goldenGlove: "e-martinez",
    stageReached: {
      r16: [...FINAL_FOUR, ...DARK_HORSES, "ENG", "POR"],
      qf: [...FINAL_FOUR, ...DARK_HORSES],
      sf: FINAL_FOUR,
      final: ["ARG", "FRA"],
      champion: [CHAMP],
    },
  };
}

/** Dev-only: jump the app to a tournament stage (clock + seeded results). */
export async function applyPreviewStage(key: PreviewStageKey): Promise<void> {
  if (!PREVIEW_ENABLED) return;
  const stage = previewStage(key);
  if (!stage) return;

  // 1) Pin the simulated clock.
  (await cookies()).set(PREVIEW_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  // 2) Seed the dev store's results + recompute scores for that stage.
  try {
    const repo = await db();
    const settings = await repo.getSettings();
    await repo.saveResults(resultsForStage(key, settings.groups ?? {}));
    await recomputeScores({ pullFromProvider: false });
  } catch {
    /* dev store only — ignore */
  }

  revalidatePath("/", "layout");
}

/** Dev-only: clear preview (back to the real clock + empty results). */
export async function clearPreview(): Promise<void> {
  if (!PREVIEW_ENABLED) return;
  (await cookies()).delete(PREVIEW_COOKIE);
  try {
    const repo = await db();
    await repo.saveResults(EMPTY_RESULTS);
    await recomputeScores({ pullFromProvider: false });
  } catch {
    /* ignore */
  }
  revalidatePath("/", "layout");
}

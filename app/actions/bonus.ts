"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { recomputeScores } from "@/lib/services";
import { setSessionToken } from "@/lib/session";
import { DARK_HORSE_TEAMS } from "@/lib/dark-horse";
import { PLAYER_BY_ID } from "@/lib/players";
import type { BonusPicks } from "@/lib/types";

const playerId = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .refine((v) => v === null || Boolean(PLAYER_BY_ID[v]), "Unknown player");

const teamCode = z
  .string()
  .trim()
  .max(8)
  .nullable()
  .refine((v) => v === null || DARK_HORSE_TEAMS.includes(v), "Not an eligible Dark Horse");

const bonusSchema = z.object({
  token: z.string().min(8),
  goldenBall: playerId,
  goldenBoot: playerId,
  goldenGlove: playerId,
  darkHorse: teamCode,
});

export type BonusResult = { ok: true } | { ok: false; error: string };

/**
 * Save the four Bonus Picks (Golden Ball/Boot/Glove + Dark Horse) onto an
 * existing entry. Editable until the bracket lock time (first kickoff); after
 * that the picks are frozen like the bracket.
 */
export async function saveBonusPicks(
  raw: z.input<typeof bonusSchema>,
): Promise<BonusResult> {
  const parsed = bonusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, goldenBall, goldenBoot, goldenGlove, darkHorse } = parsed.data;
  try {
    const repo = await db();
    const settings = await repo.getSettings();
    if (Date.now() >= new Date(settings.lockTime).getTime()) {
      return { ok: false, error: "Bonus Picks are locked — the tournament has started." };
    }
    const bonus: BonusPicks = { goldenBall, goldenBoot, goldenGlove, darkHorse };
    const updated = await repo.updateByToken(token, { predictions: { bonus } });
    if (!updated) return { ok: false, error: "Entry not found." };
    await recomputeScores({ pullFromProvider: false }).catch(() => {});
    // Keep them recognized as a returning member after saving.
    await setSessionToken(updated.resumeToken).catch(() => {});
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendPredictionConfirmation } from "@/lib/email";
import { env } from "@/lib/env";
import { recomputeScores } from "@/lib/services";
import { setSessionToken } from "@/lib/session";
import type { Predictions } from "@/lib/types";

const code = z.string().trim().min(2).max(8);

const predictionBase = z.object({
  name: z.string().trim().min(1, "Add your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(160),
  rootingCountry: code.nullable(),
  // Group winners: { "A": code, ..., "L": code } — all 12 required to submit.
  groupWinners: z.record(z.string(), code).nullable(),
  // Final Four — exactly 4 distinct team codes.
  semifinalists: z.array(code).max(4).nullable(),
  // Champion — must be one of the four semifinalists.
  champion: code.nullable(),
  finalTotalGoals: z.number().int().min(0).max(20).nullable(),
  crewCode: z.string().trim().max(40).nullable().optional(),
  ref: z.string().trim().max(40).nullable().optional(),
});

const predictionSchema = predictionBase.superRefine((d, ctx) => {
    const groups = d.groupWinners ?? {};
    if (Object.keys(groups).length !== 12) {
      ctx.addIssue({ code: "custom", message: "Pick all 12 group winners." });
    }
    const sf = d.semifinalists ?? [];
    if (sf.length !== 4 || new Set(sf).size !== 4) {
      ctx.addIssue({ code: "custom", message: "Pick exactly 4 semifinalists." });
    }
    if (!d.champion) {
      ctx.addIssue({ code: "custom", message: "Pick your champion." });
    } else if (sf.length && !sf.includes(d.champion)) {
      ctx.addIssue({ code: "custom", message: "Champion must be one of your Final Four." });
    }
  });

export type SubmitResult =
  | { ok: true; token: string }
  | { ok: false; error: string; code?: "EMAIL_EXISTS" };

export async function submitPredictions(
  raw: z.input<typeof predictionSchema>,
): Promise<SubmitResult> {
  const parsed = predictionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const predictions: Predictions = {
    groupWinners: d.groupWinners,
    semifinalists: d.semifinalists,
    champion: d.champion,
    finalTotalGoals: d.finalTotalGoals,
    bonus: null,
  };

  try {
    const repo = await db();
    // One entry per email. If this email already has a bracket, don't create a
    // second one or overwrite it — send them to the editor instead. (Fair play:
    // no double entries, and nobody can clobber someone else's bracket.)
    const existing = await repo.getByEmail(d.email);
    if (existing) {
      return {
        ok: false,
        code: "EMAIL_EXISTS",
        error: "This email already has a bracket. Use “Edit your picks” to update it.",
      };
    }

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

    // Confirmation email — best-effort (never blocks the submission).
    const settings = await repo.getSettings();
    await sendPredictionConfirmation({
      to: participant.email,
      firstName: participant.name.split(" ")[0] || participant.name,
      editUrl: `${env.NEXT_PUBLIC_APP_URL}/r/${participant.resumeToken}`,
      shareUrl: `${env.NEXT_PUBLIC_APP_URL}/copa/${participant.slug}`,
      deadlineIso: settings.lockTime,
    }).catch((e) => console.error("Confirmation email failed:", e));

    // Remember this member so home/status-bar/picks can greet them on return.
    await setSessionToken(participant.resumeToken).catch(() => {});

    return { ok: true, token: participant.resumeToken };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const emailSchema = z.string().trim().email().max(160);

export type FindResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/**
 * Look up an existing entry by email so a member can get back into the game
 * without their resume link. On a match we also set the returning-member cookie
 * so the homepage recognizes them automatically from now on (no more hunting).
 * (Low-stakes community game — no email verification, same trust model as
 * re-submitting with the same email.)
 */
export async function findResumeToken(rawEmail: string): Promise<FindResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  try {
    const repo = await db();
    const me = await repo.getByEmail(parsed.data);
    if (!me) {
      return {
        ok: false,
        error: "We couldn't find an entry for that email. Check the spelling, or start a new one.",
      };
    }
    await setSessionToken(me.resumeToken).catch(() => {});
    return { ok: true, token: me.resumeToken };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// Edits go through the same completeness rules as a fresh submit (the editor
// always sends a full bracket), so reuse predictionSchema + a token.
const updateSchema = predictionBase
  .extend({ token: z.string().min(8) })
  .superRefine((d, ctx) => {
    const groups = d.groupWinners ?? {};
    if (Object.keys(groups).length !== 12)
      ctx.addIssue({ code: "custom", message: "Pick all 12 group winners." });
    const sf = d.semifinalists ?? [];
    if (sf.length !== 4 || new Set(sf).size !== 4)
      ctx.addIssue({ code: "custom", message: "Pick exactly 4 semifinalists." });
    if (!d.champion) ctx.addIssue({ code: "custom", message: "Pick your champion." });
    else if (sf.length && !sf.includes(d.champion))
      ctx.addIssue({ code: "custom", message: "Champion must be one of your Final Four." });
  });

export async function updatePredictions(
  raw: z.input<typeof updateSchema>,
): Promise<SubmitResult> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, name, rootingCountry, groupWinners, semifinalists, champion, finalTotalGoals } =
    parsed.data;
  try {
    const repo = await db();
    const updated = await repo.updateByToken(token, {
      name,
      rootingCountry: rootingCountry ?? undefined,
      predictions: { groupWinners, semifinalists, champion, finalTotalGoals },
    });
    if (!updated) return { ok: false, error: "Entry not found." };
    await recomputeScores({ pullFromProvider: false }).catch(() => {});
    await setSessionToken(updated.resumeToken).catch(() => {});
    return { ok: true, token: updated.resumeToken };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

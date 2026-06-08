"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ADMIN_COOKIE,
  checkPassword,
  isAdmin,
  makeAdminToken,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { generateCommunityUpdates } from "@/lib/community";
import { sendEmail } from "@/lib/email";
import { buildSampleEmails } from "@/lib/email-template";
import { env } from "@/lib/env";
import { recomputeScores, syncTournamentGroups } from "@/lib/services";
import type { KnockoutRound, LiveMatch, Results, Settings } from "@/lib/types";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized");
}

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  if (!checkPassword(password)) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, makeAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function adminLogout() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function triggerRecalc(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    const report = await recomputeScores({ pullFromProvider: true });
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    revalidatePath("/picks/live");
    const synced =
      report.liveMatches > 0 ? `Synced ${report.liveMatches} knockout matchups · ` : "";
    return {
      ok: true,
      message: `${synced}recalculated ${report.participants} entries via ${report.provider}.`,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function syncGroupsAction(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    const { count, provider } = await syncTournamentGroups();
    revalidatePath("/admin");
    revalidatePath("/play");
    return count > 0
      ? { ok: true, message: `Synced ${count} groups from ${provider}.` }
      : { ok: false, message: `No groups returned by ${provider}. Check the provider/key.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function saveResultsAction(input: Partial<Results>) {
  await requireAdmin();
  const repo = await db();
  const current = await repo.getResults();
  await repo.saveResults({ ...current, ...input });
  await recomputeScores({ pullFromProvider: false });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

export async function setAwardsRevealed(reveal: boolean): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const repo = await db();
  const current = await repo.getSettings();
  await repo.saveSettings({ ...current, awardsRevealed: reveal });
  revalidatePath("/admin");
  revalidatePath("/awards");
  revalidatePath("/leaderboard");
  return { ok: true, message: reveal ? "Honors are live on /awards." : "Honors hidden." };
}

export async function saveSettingsAction(input: Partial<Settings>) {
  await requireAdmin();
  const repo = await db();
  const current = await repo.getSettings();
  await repo.saveSettings({
    ...current,
    ...input,
    weights: { ...current.weights, ...(input.weights ?? {}) },
  });
  revalidatePath("/admin");
}

/** Set (replace) one knockout round's matchups for the Live Picks game. Other
 * rounds are left untouched. Empty/partial matches (a side not chosen) are
 * dropped so the pick screen only ever shows complete cards. */
export async function saveLiveMatchesAction(
  round: KnockoutRound,
  matches: LiveMatch[],
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const repo = await db();
  const current = await repo.getSettings();
  const complete = matches.filter(
    (m) => m.round === round && m.homeCode && m.awayCode && m.homeCode !== m.awayCode,
  );
  const others = current.liveMatches.filter((m) => m.round !== round);
  await repo.saveSettings({ ...current, liveMatches: [...others, ...complete] });
  revalidatePath("/admin");
  revalidatePath("/picks");
  revalidatePath("/picks/live");
  return { ok: true, message: `Saved ${complete.length} matchups for ${round.toUpperCase()}.` };
}

/** Record knockout match winners (matchId → team code). A blank value clears a
 * result. Recomputes every score so the Live leaderboard updates immediately. */
export async function saveMatchWinnersAction(
  winners: Record<string, string>,
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const repo = await db();
  const [current, settings] = await Promise.all([repo.getResults(), repo.getSettings()]);

  // Integrity guard: a recorded winner must be one of that match's two teams,
  // and the match must exist. Reject the whole save on any mismatch so a bad
  // result can never silently award (or withhold) points.
  const matchById = new Map(settings.liveMatches.map((m) => [m.matchId, m]));
  for (const [id, code] of Object.entries(winners)) {
    if (!code) continue; // blank = clear, always allowed
    const m = matchById.get(id);
    if (!m) {
      return { ok: false, message: `No matchup found for "${id}". Set the matchup first.` };
    }
    if (code !== m.homeCode && code !== m.awayCode) {
      return {
        ok: false,
        message: `Winner "${code}" isn't in match ${id} (${m.homeCode} vs ${m.awayCode}).`,
      };
    }
  }

  const matchWinners = { ...current.matchWinners };
  for (const [id, code] of Object.entries(winners)) {
    if (code) matchWinners[id] = code;
    else delete matchWinners[id];
  }
  await repo.saveResults({ ...current, matchWinners });
  await recomputeScores({ pullFromProvider: false });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { ok: true, message: `Saved ${Object.keys(winners).length} result(s).` };
}

export async function generateUpdatesAction(): Promise<{ count: number }> {
  await requireAdmin();
  const updates = await generateCommunityUpdates();
  const repo = await db();
  await repo.addContent(updates);
  revalidatePath("/admin");
  return { count: updates.length };
}

/** Send one of every email design to a single address, to confirm Resend is
 * working — without touching any member. Admin-gated (no secret-in-URL needed). */
export async function sendTestEmailsAction(
  toEmail: string,
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const email = toEmail.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!env.RESEND_API_KEY) {
    return { ok: false, message: "RESEND_API_KEY isn't set in Vercel yet — add it and redeploy." };
  }
  const samples = buildSampleEmails(env.NEXT_PUBLIC_APP_URL);
  let sent = 0;
  for (const s of samples) {
    const ok = await sendEmail({ to: email, subject: `[Sample] ${s.subject}`, html: s.html }).catch(
      () => false,
    );
    if (ok) sent += 1;
  }
  if (sent === 0) {
    return {
      ok: false,
      message:
        "Resend rejected every send — almost always because the EMAIL_FROM domain isn't verified in Resend. Check Resend → Domains (it needs a green check).",
    };
  }
  return {
    ok: true,
    message: `Sent ${sent}/${samples.length} sample emails to ${email}. Check your inbox (and spam). If they arrived, email delivery is working. ✅`,
  };
}

export async function deleteParticipantAction() {
  // Reserved: deletion not exposed in MVP admin to avoid accidental data loss.
}

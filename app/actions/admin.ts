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
import {
  getScoreMatchAdminView,
  recomputeScores,
  syncScoreMatchFixtures,
  syncTournamentGroups,
} from "@/lib/services";
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
    const drawn =
      report.derivedMatchups > 0
        ? `Drew ${report.derivedMatchups} matchup(s) from confirmed results · `
        : "";
    const feedTrouble =
      report.providerErrors.length > 0 ? ` ⚠️ Feed: ${report.providerErrors.join(" · ")}` : "";
    return {
      ok: true,
      message: `${synced}${drawn}recalculated ${report.participants} entries via ${report.provider}.${feedTrouble}`,
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
  // A row submitted without a kickoff keeps the kickoff the matchup already
  // had (e.g. one set by the provider sync) — a null kickoff means the game
  // can never be picked, so it must never be possible to lose one by accident.
  const existingById = new Map(current.liveMatches.map((m) => [m.matchId, m]));
  const complete = matches
    .filter((m) => m.round === round && m.homeCode && m.awayCode && m.homeCode !== m.awayCode)
    .map((m) => ({
      ...m,
      kickoffIso: m.kickoffIso ?? existingById.get(m.matchId)?.kickoffIso ?? null,
    }));
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

// ── Bonus score predictions (Phase 1: shadow-first, admin-confirmed) ──────────

function revalidateScoreViews() {
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

/** Link the seeded score-prediction matches to API fixtures (metadata only). */
export async function linkScoreFixturesAction(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    const r = await syncScoreMatchFixtures();
    revalidatePath("/admin");
    if (r.provider !== "api-football") {
      return { ok: false, message: `Provider is "${r.provider}", which has no fixture ids to link. Set API-Football to enable linking.` };
    }
    return {
      ok: true,
      message: `Linked ${r.linked} new · ${r.alreadyLinked} already linked · ${r.ambiguous} ambiguous · ${r.unmatched} unmatched (via ${r.provider}).`,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Confirm the API's final score for a match and award points. Re-reads the
 * view server-side so we award the verified, team-oriented API value — never a
 * number passed from the client. */
export async function useApiScoreAction(matchId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    const row = (await getScoreMatchAdminView()).find((r) => r.match.matchId === matchId);
    if (!row) return { ok: false, message: "Match not found." };
    if (row.state === "scored") return { ok: false, message: "Already scored. Use Correct & re-score to change it." };
    if (row.state !== "final-unscored" || row.apiFinalA == null || row.apiFinalB == null) {
      return { ok: false, message: "No confirmed API final score for this match yet. Score by hand if needed." };
    }
    const repo = await db();
    const { scored } = await repo.scoreMatch(matchId, row.apiFinalA, row.apiFinalB, "api");
    await recomputeScores({ pullFromProvider: false });
    revalidateScoreViews();
    return { ok: true, message: `Scored from API — ${row.apiScoreLabel}. ${scored} prediction${scored === 1 ? "" : "s"} awarded. Leaderboard updated.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Score a match by hand (fallback when the API is missing/wrong). */
export async function scoreManuallyAction(
  matchId: string,
  finalScoreA: number,
  finalScoreB: number,
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const valid = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 30;
  if (!valid(finalScoreA) || !valid(finalScoreB)) {
    return { ok: false, message: "Enter whole-number scores between 0 and 30." };
  }
  try {
    const repo = await db();
    const match = await repo.getScoreMatch(matchId);
    if (!match) return { ok: false, message: `Match not found: ${matchId}` };
    if (match.finalScoreA != null && match.scoredBy != null) {
      return { ok: false, message: "Already scored. Use Correct & re-score to change it." };
    }
    const { scored } = await repo.scoreMatch(matchId, finalScoreA, finalScoreB, "admin");
    await recomputeScores({ pullFromProvider: false });
    revalidateScoreViews();
    return { ok: true, message: `Scored by hand — ${match.teamA} ${finalScoreA}–${finalScoreB} ${match.teamB}. ${scored} prediction${scored === 1 ? "" : "s"} awarded. Leaderboard updated.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Safely undo ONE match's scoring (clears its points), then recompute, so a
 * wrong score can be re-entered. Other matches are untouched. */
export async function resetScoreAction(matchId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    const repo = await db();
    const { reset } = await repo.resetMatchScoring(matchId);
    await recomputeScores({ pullFromProvider: false });
    revalidateScoreViews();
    return { ok: true, message: `Reset this match — ${reset} prediction${reset === 1 ? "" : "s"} cleared. Re-enter or confirm the correct score.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

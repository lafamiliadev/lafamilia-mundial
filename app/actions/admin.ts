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
import { recomputeScores, syncTournamentGroups } from "@/lib/services";
import type { Results, Settings } from "@/lib/types";

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
    return {
      ok: true,
      message: `Recalculated ${report.participants} entries via ${report.provider}.`,
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

export async function generateUpdatesAction(): Promise<{ count: number }> {
  await requireAdmin();
  const updates = await generateCommunityUpdates();
  const repo = await db();
  await repo.addContent(updates);
  revalidatePath("/admin");
  return { count: updates.length };
}

export async function deleteParticipantAction() {
  // Reserved: deletion not exposed in MVP admin to avoid accidental data loss.
}

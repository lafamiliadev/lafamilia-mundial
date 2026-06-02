"use server";

import { db } from "@/lib/db";

// Fired once per session from a real browser on a share page, so visit counts
// reflect humans (crawlers / WhatsApp unfurl bots don't run this).
export async function recordReferralVisit(slug: string): Promise<void> {
  if (!slug) return;
  try {
    const repo = await db();
    await repo.incrementReferralVisits(slug);
  } catch {
    // best-effort — never block the page
  }
}

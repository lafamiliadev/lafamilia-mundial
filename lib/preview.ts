import "server-only";
import { cookies } from "next/headers";
import { PREVIEW_COOKIE, previewStage } from "./preview-stages";
import type { PreviewStageKey } from "./preview-stages";

// Dev-only time travel for QA. In production this is always a no-op: `now()`
// returns the real clock and the preview panel is never rendered. Locally, a
// cookie pins a simulated "now" so every date-driven screen (countdowns, which
// picks are open, leaderboard state) renders as it will during the tournament.

export const PREVIEW_ENABLED = process.env.NODE_ENV !== "production";

/** The active preview stage key (dev only), or null. */
export async function getPreviewKey(): Promise<PreviewStageKey | null> {
  if (!PREVIEW_ENABLED) return null;
  try {
    const v = (await cookies()).get(PREVIEW_COOKIE)?.value;
    return (previewStage(v)?.key ?? null) as PreviewStageKey | null;
  } catch {
    return null;
  }
}

/** The effective "now" — the simulated time in preview, otherwise the real clock. */
export async function now(): Promise<Date> {
  if (!PREVIEW_ENABLED) return new Date();
  try {
    const v = (await cookies()).get(PREVIEW_COOKIE)?.value;
    const iso = previewStage(v)?.nowIso;
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    /* fall through to real clock */
  }
  return new Date();
}

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { recomputeScores } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Automated scoring loop. Triggered by Vercel Cron (see vercel.json) and
// protected by CRON_SECRET. Pulls fresh results from the active football
// provider, merges admin overrides, and recomputes every participant's score.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const provided =
    auth?.replace("Bearer ", "") ?? url.searchParams.get("secret") ?? "";

  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await recomputeScores({ pullFromProvider: true });
    return NextResponse.json({ ok: true, ...report, ranAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

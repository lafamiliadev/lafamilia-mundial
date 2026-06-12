import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { recomputeScores } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin endpoint: set the final score for a match and award points to all
// predictions on that match. Idempotent — predictions already scored (points_awarded
// is not null) are skipped. Triggers a full leaderboard recompute so the board
// reflects the new bonus points immediately.
//
// POST /api/admin/score-match
// Body: { matchId, finalScoreA, finalScoreB }
// Auth: Authorization: Bearer <ADMIN_PASSWORD>
export async function POST(req: Request) {
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (provided !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { matchId?: string; finalScoreA?: unknown; finalScoreB?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { matchId, finalScoreA, finalScoreB } = body;
  if (
    typeof matchId !== "string" ||
    !matchId ||
    typeof finalScoreA !== "number" ||
    typeof finalScoreB !== "number" ||
    !Number.isInteger(finalScoreA) ||
    !Number.isInteger(finalScoreB) ||
    finalScoreA < 0 ||
    finalScoreB < 0 ||
    finalScoreA > 30 ||
    finalScoreB > 30
  ) {
    return NextResponse.json(
      { ok: false, error: "Required: matchId (string), finalScoreA (int 0–30), finalScoreB (int 0–30)" },
      { status: 400 },
    );
  }

  try {
    const repo = await db();
    const match = await repo.getScoreMatch(matchId);
    if (!match) {
      return NextResponse.json({ ok: false, error: `Match not found: ${matchId}` }, { status: 404 });
    }

    const { scored } = await repo.scoreMatch(matchId, finalScoreA, finalScoreB, "admin");

    // Recompute the leaderboard so bonus points are immediately reflected.
    await recomputeScores({ pullFromProvider: false }).catch((e) =>
      console.error("Leaderboard recompute failed after scoring match:", e),
    );

    return NextResponse.json({
      ok: true,
      matchId,
      finalScoreA,
      finalScoreB,
      predictionsScored: scored,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

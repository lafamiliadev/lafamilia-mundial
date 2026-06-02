import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { playerName } from "@/lib/players";
import { teamName } from "@/lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV export of participants + predictions + scores (admin only).
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "participants";

  const repo = await db();
  const participants = await repo.listParticipants();
  const scores = await repo.getScores();

  let rows: (string | number | null)[][];
  let header: string[];

  if (kind === "leaderboard") {
    header = ["rank", "name", "rooting_for", "total_points"];
    rows = participants
      .map((p) => ({
        rank: scores[p.id]?.rank ?? 0,
        name: p.name,
        country: teamName(p.rootingCountry),
        total: scores[p.id]?.total ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
      .map((r, i) => [r.rank || i + 1, r.name, r.country, r.total]);
  } else {
    header = [
      "name",
      "email",
      "rooting_for",
      "champion",
      "runner_up",
      "golden_boot",
      "dark_horse",
      "latam_furthest",
      "final_goals",
      "total_points",
      "created_at",
    ];
    rows = participants.map((p) => [
      p.name,
      p.email,
      teamName(p.rootingCountry),
      teamName(p.predictions.champion),
      teamName(p.predictions.runnerUp),
      playerName(p.predictions.goldenBoot),
      teamName(p.predictions.darkHorse),
      teamName(p.predictions.latamFurthest),
      p.predictions.finalTotalGoals,
      scores[p.id]?.total ?? 0,
      p.createdAt,
    ]);
  }

  const csv = [header, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="mundial-${kind}.csv"`,
    },
  });
}

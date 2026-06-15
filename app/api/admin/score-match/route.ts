import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { renderScorePoints, scorePointsSubject, scorePointsTemplateId } from "@/lib/email-template";
import { env } from "@/lib/env";
import { now } from "@/lib/preview";
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

    // Excited "you earned points" email to everyone who scored on this game.
    // Idempotent per match, gated by the email switch, and fully wrapped so a
    // send failure NEVER affects scoring.
    let pointsEmailsSent = 0;
    try {
      if (env.SCORE_WINDOW_EMAILS_ENABLED === "true" && env.RESEND_API_KEY) {
        const [preds, participants, scores, allMatches, nowD] = await Promise.all([
          repo.getMatchScorePredictions(matchId),
          repo.listParticipants(),
          repo.getScores(),
          repo.getScoreMatches(),
          now(),
        ]);
        const earners = preds.filter((p) => (p.pointsAwarded ?? 0) >= 1);
        const already = await repo.getScoreEmailRecipients(scorePointsTemplateId(matchId));
        const byId = new Map(participants.map((p) => [p.id, p]));
        const nowMs = nowD.getTime();
        const fmtDate = (iso: string) =>
          new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "America/Los_Angeles" }).format(
            new Date(iso),
          );
        const upcoming = allMatches
          .filter((m) => new Date(m.kickoffUtc).getTime() > nowMs && m.matchId !== matchId)
          .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))
          .slice(0, 3)
          .map((m) => ({ match: `${m.teamA} vs ${m.teamB}`, dateLabel: fmtDate(m.kickoffUtc) }));
        const recipients = earners.filter(
          (e) => !already.has(e.participantId) && byId.get(e.participantId)?.email,
        );
        const messages = recipients.map((e) => {
          const person = byId.get(e.participantId)!;
          return {
            participantId: e.participantId,
            to: person.email,
            subject: scorePointsSubject(e.pointsAwarded ?? 0, match.teamA, match.teamB),
            html: renderScorePoints({
              firstName: (person.name ?? "").split(" ")[0] || "familia",
              teamA: match.teamA,
              teamB: match.teamB,
              finalA: finalScoreA,
              finalB: finalScoreB,
              predA: e.scoreA,
              predB: e.scoreB,
              points: e.pointsAwarded ?? 0,
              total: scores[e.participantId]?.total ?? 0,
              upcoming,
              scoreUrl: `${env.NEXT_PUBLIC_APP_URL}/leaderboard?view=score`,
            }),
          };
        });
        const results = await sendEmailBatch(messages.map((m) => ({ to: m.to, subject: m.subject, html: m.html })));
        for (let i = 0; i < messages.length; i++) {
          const ok = results[i];
          await repo.logScoreEmail(messages[i].participantId, scorePointsTemplateId(matchId), ok ? "sent" : "failed");
          if (ok) pointsEmailsSent++;
        }
      }
    } catch (e) {
      console.error("Points email after scoring failed:", e);
    }

    return NextResponse.json({
      ok: true,
      matchId,
      finalScoreA,
      finalScoreB,
      predictionsScored: scored,
      pointsEmailsSent,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

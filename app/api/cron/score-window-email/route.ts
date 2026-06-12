import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  renderScoreWindowOpen,
  scoreWindowSubject,
  scoreWindowTemplateId,
} from "@/lib/email-template";
import { env } from "@/lib/env";
import { now } from "@/lib/preview";
import { scoreWindowEmailDue } from "@/lib/score-picks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-match Bonus Score Pick "window is open" reminder. For every match whose
// 24h window has FRESHLY opened (open now + opened within the last few hours),
// email each member who hasn't already been emailed for it and hasn't already
// predicted it. Protected by CRON_SECRET.
//
// Safety, by design:
//  - Window-gated: only matches that are actually open (never upcoming/closed).
//  - Fresh-only: never a catch-up blast for windows that opened long ago.
//  - Idempotent: score_email_log keyed per match → exactly one email per person.
//  - Skips members who already predicted the match.
//  - Gated by SCORE_WINDOW_EMAILS_ENABLED — until that's "true" it only reports
//    (never sends), so the cron can be wired up safely.
//  - ?dry=1 reports who WOULD be emailed without sending or logging.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    url.searchParams.get("secret") ??
    "";
  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dry = url.searchParams.get("dry") != null;
  const enabled = env.SCORE_WINDOW_EMAILS_ENABLED === "true";

  try {
    const repo = await db();
    const [matches, participants] = await Promise.all([
      repo.getScoreMatches(),
      repo.listParticipants(),
    ]);
    const nowMs = (await now()).getTime();
    const due = matches.filter((m) => scoreWindowEmailDue(m, nowMs));

    // Build the recipient list per due match (idempotent + skip-already-predicted),
    // so dry-run and the gated-off state report exactly what would be sent.
    const plan: { matchId: string; teams: string; recipients: { id: string; email: string; first: string }[] }[] = [];
    for (const m of due) {
      const [alreadyEmailed, predictedIds] = await Promise.all([
        repo.getScoreEmailRecipients(scoreWindowTemplateId(m.matchId)),
        repo.getScorePredictionParticipantIds(m.matchId),
      ]);
      const predicted = new Set(predictedIds);
      const recipients = participants
        .filter((p) => !alreadyEmailed.has(p.id) && !predicted.has(p.id))
        .map((p) => ({ id: p.id, email: p.email, first: p.name.split(" ")[0] || p.name }));
      plan.push({ matchId: m.matchId, teams: `${m.teamA} vs ${m.teamB}`, recipients });
    }

    if (dry || !enabled || !env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        sent: false,
        reason: dry ? "dry-run" : !enabled ? "SCORE_WINDOW_EMAILS_ENABLED not 'true'" : "RESEND_API_KEY not set",
        nowIso: new Date(nowMs).toISOString(),
        dueWindows: plan.map((p) => ({ match: p.teams, wouldEmail: p.recipients.length })),
      });
    }

    const report: Record<string, string> = {};
    for (const m of due) {
      const entry = plan.find((p) => p.matchId === m.matchId)!;
      const templateId = scoreWindowTemplateId(m.matchId);
      let okCount = 0;
      for (const r of entry.recipients) {
        const ok = await sendEmail({
          to: r.email,
          subject: scoreWindowSubject(m.teamA, m.teamB),
          html: renderScoreWindowOpen({
            firstName: r.first,
            teamA: m.teamA,
            teamB: m.teamB,
            locksLabel: m.displayTimePt,
            scoreUrl: `${env.NEXT_PUBLIC_APP_URL}/picks/score`,
          }),
        }).catch(() => false);
        await repo.logScoreEmail(r.id, templateId, ok ? "sent" : "failed");
        if (ok) okCount++;
      }
      report[entry.teams] = `${okCount}/${entry.recipients.length}`;
    }

    return NextResponse.json({ ok: true, sent: true, nowIso: new Date(nowMs).toISOString(), report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  renderScoreWindowDay,
  scoreWindowDaySubject,
  scoreWindowDayTemplateId,
} from "@/lib/email-template";
import { env } from "@/lib/env";
import { now } from "@/lib/preview";
import { dueScoreDayGroups, planScoreDayEmails } from "@/lib/score-picks";
import type { ScoreMatch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bonus Score Pick reminder — GROUPED, one email per member per day. For every
// PT day whose first window has freshly opened, send ONE email listing that
// day's score picks the member hasn't done yet. Protected by CRON_SECRET.
//
// Safety, by design:
//  - One email per member per PT day (idempotent via a per-DAY email-log key).
//  - Window-gated + fresh-only (anchored to the day's first window opening) —
//    never a catch-up blast for an older day (e.g. USA vs Paraguay).
//  - Skips members who have already predicted all of that day's matches; for
//    the rest, the email lists only the ones they still owe.
//  - Gated by SCORE_WINDOW_EMAILS_ENABLED — reports only until it's "true".
//  - ?dry=1 reports who WOULD be emailed without sending or logging.

/** "Sat, Jun 13, 3:00 PM PT" — the close (kickoff) time in PT. */
function closesLabelPt(kickoffUtc: string): string {
  const s = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  }).format(new Date(kickoffUtc));
  return `${s} PT`;
}

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
    const groups = dueScoreDayGroups(matches, nowMs);

    // Predictor sets (matchId → who already predicted) for every match in a due
    // group, and who's already been emailed for each day-group.
    const predictorsByMatch: Record<string, Set<string>> = {};
    const alreadyEmailedByTemplate: Record<string, Set<string>> = {};
    for (const g of groups) {
      alreadyEmailedByTemplate[scoreWindowDayTemplateId(g.ptDate)] =
        await repo.getScoreEmailRecipients(scoreWindowDayTemplateId(g.ptDate));
      for (const m of g.matches) {
        if (!predictorsByMatch[m.matchId]) {
          predictorsByMatch[m.matchId] = new Set(await repo.getScorePredictionParticipantIds(m.matchId));
        }
      }
    }

    const plan = planScoreDayEmails(
      groups,
      participants.map((p) => p.id),
      predictorsByMatch,
      alreadyEmailedByTemplate,
      scoreWindowDayTemplateId,
    );

    if (dry || !enabled || !env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        sent: false,
        reason: dry ? "dry-run" : !enabled ? "SCORE_WINDOW_EMAILS_ENABLED not 'true'" : "RESEND_API_KEY not set",
        nowIso: new Date(nowMs).toISOString(),
        dueDays: plan.map((d) => ({
          day: d.ptDate,
          matches: groups.find((g) => g.ptDate === d.ptDate)?.matches.map((m: ScoreMatch) => `${m.teamA} vs ${m.teamB}`),
          wouldEmail: d.recipients.length,
        })),
      });
    }

    const byId = new Map(participants.map((p) => [p.id, p]));
    const report: Record<string, string> = {};
    for (const day of plan) {
      let okCount = 0;
      for (const r of day.recipients) {
        const p = byId.get(r.participantId)!;
        const ok = await sendEmail({
          to: p.email,
          subject: scoreWindowDaySubject(r.remaining.length),
          html: renderScoreWindowDay({
            firstName: p.name.split(" ")[0] || p.name,
            matches: r.remaining.map((m) => ({
              teamA: m.teamA,
              teamB: m.teamB,
              closesLabel: closesLabelPt(m.kickoffUtc),
            })),
            scoreUrl: `${env.NEXT_PUBLIC_APP_URL}/picks/score`,
          }),
        }).catch(() => false);
        await repo.logScoreEmail(r.participantId, day.templateId, ok ? "sent" : "failed");
        if (ok) okCount++;
      }
      report[day.ptDate] = `${okCount}/${day.recipients.length}`;
    }

    return NextResponse.json({ ok: true, sent: true, nowIso: new Date(nowMs).toISOString(), report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

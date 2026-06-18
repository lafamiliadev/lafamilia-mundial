import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import {
  renderScoreLockingSoon,
  scoreLockingSoonSubject,
  scoreLockTemplateId,
} from "@/lib/email-template";
import { env } from "@/lib/env";
import { now } from "@/lib/preview";
import { lockingSoonMatches, ptDateOf } from "@/lib/score-picks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // batch sends + per-recipient logging headroom

// Daily "locking soon" Bonus Score Pick nudge. Every bonus game is open all
// tournament; this only nudges members about games LOCKING in the next ~30h that
// they haven't predicted yet. So an organized predictor never hears from it.
//
// Triggered by Vercel Cron (vercel.json) — Vercel auto-signs with CRON_SECRET.
//
// Safety, by design:
//  - One email per member per PT day (idempotent via score-lock-<date> log key).
//  - Only games locking soon that the member hasn't predicted — nothing else.
//  - Batch send so a 100+ recipient run never trips Resend's rate limit.
//  - Gated by SCORE_WINDOW_EMAILS_ENABLED — reports only until it's "true".
//  - ?dry=1 reports who WOULD be emailed without sending or logging.

/** "Sat, Jun 13, 3:00 PM PT" — the lock (kickoff) time in PT. */
function lockLabelPt(kickoffUtc: string): string {
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
    const [matches, participants, scores] = await Promise.all([
      repo.getScoreMatches(),
      repo.listParticipants(),
      repo.getScores(),
    ]);
    const nowMs = (await now()).getTime();

    // Games locking within the next ~30h (soonest first), and who already picked each.
    const soon = lockingSoonMatches(matches, nowMs);
    const templateId = scoreLockTemplateId(ptDateOf(nowMs));
    const predictorsByMatch: Record<string, Set<string>> = {};
    for (const m of soon) {
      predictorsByMatch[m.matchId] = new Set(await repo.getScorePredictionParticipantIds(m.matchId));
    }
    const alreadyToday = soon.length ? await repo.getScoreEmailRecipients(templateId) : new Set<string>();

    // One recipient per member who (a) hasn't had today's nudge, (b) has an email,
    // (c) still owes at least one of the soon-to-lock games.
    const recipients = participants
      .filter((p) => p.email && !alreadyToday.has(p.id))
      .map((p) => ({ p, remaining: soon.filter((m) => !predictorsByMatch[m.matchId].has(p.id)) }))
      .filter((r) => r.remaining.length > 0);

    if (dry || !enabled || !env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        sent: false,
        reason: dry ? "dry-run" : !enabled ? "SCORE_WINDOW_EMAILS_ENABLED not 'true'" : "RESEND_API_KEY not set",
        nowIso: new Date(nowMs).toISOString(),
        lockingSoon: soon.map((m) => `${m.teamA} vs ${m.teamB} — locks ${lockLabelPt(m.kickoffUtc)}`),
        wouldEmail: recipients.length,
        recipients: recipients.map((r) => ({
          name: r.p.name,
          email: r.p.email,
          stillOwes: r.remaining.map((m) => `${m.teamA} vs ${m.teamB}`),
        })),
      });
    }

    const messages = recipients.map((r) => ({
      participantId: r.p.id,
      to: r.p.email,
      subject: scoreLockingSoonSubject(r.remaining.length),
      html: renderScoreLockingSoon({
        firstName: r.p.name.split(" ")[0] || r.p.name,
        matches: r.remaining.map((m) => ({
          teamA: m.teamA,
          teamB: m.teamB,
          closesLabel: lockLabelPt(m.kickoffUtc),
        })),
        scoreUrl: `${env.NEXT_PUBLIC_APP_URL}/picks/score`,
        points: scores[r.p.id]?.total ?? 0,
        rank: scores[r.p.id]?.rank ?? null,
        totalPlayers: participants.length,
      }),
    }));

    const sentResults = await sendEmailBatch(messages.map((m) => ({ to: m.to, subject: m.subject, html: m.html })));
    let sent = 0;
    for (let i = 0; i < messages.length; i++) {
      const ok = sentResults[i];
      await repo.logScoreEmail(messages[i].participantId, templateId, ok ? "sent" : "failed");
      if (ok) sent++;
    }

    return NextResponse.json({
      ok: true,
      sent: true,
      nowIso: new Date(nowMs).toISOString(),
      report: `${sent}/${messages.length} sent`,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { bonusCatchupSubject, renderBonusCatchup } from "@/lib/email-template";
import { env } from "@/lib/env";
import { now } from "@/lib/preview";
import { openScoreMatches } from "@/lib/score-picks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Catch up" reminder — manually triggered ~3 days after launch (wave 1) and
// ~4 days later (wave 2). Goes ONLY to members who are far behind: they've
// predicted under 40% of the games still open AND still owe at least 5 of them.
// So nobody who's keeping up ever hears from it. Protected by CRON_SECRET.
//
//  - ?wave=1 (default) or ?wave=2 — each wave is logged separately, so wave 2
//    re-nudges anyone STILL behind (including wave-1 recipients), once.
//  - DRY by default — add ?send=1 to actually send. Batch-sent.

const UNDER = 0.4; // completion threshold
const MIN_REMAINING = 5; // only worth nudging if this many open games are unpicked

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ?? url.searchParams.get("secret") ?? "";
  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const send = url.searchParams.get("send") === "1";
  const wave = url.searchParams.get("wave") === "2" ? 2 : 1;
  const templateId = `bonus-catchup-w${wave}`;

  try {
    const repo = await db();
    const [matches, participants, preds, already] = await Promise.all([
      repo.getScoreMatches(),
      repo.listParticipants(),
      repo.getAllScorePredictions(),
      repo.getScoreEmailRecipients(templateId),
    ]);
    const nowMs = (await now()).getTime();

    // How many of the still-open games has each member predicted?
    const open = openScoreMatches(matches, nowMs);
    const openIds = new Set(open.map((m) => m.matchId));
    const openCount = open.length;
    const madeByPid: Record<string, number> = {};
    for (const p of preds) {
      if (openIds.has(p.matchId)) madeByPid[p.participantId] = (madeByPid[p.participantId] ?? 0) + 1;
    }

    const recipients = participants
      .filter((p) => p.email && !already.has(p.id))
      .map((p) => ({ p, made: madeByPid[p.id] ?? 0 }))
      .filter(
        ({ made }) => openCount > 0 && made / openCount < UNDER && openCount - made >= MIN_REMAINING,
      );

    if (!send || !env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        sent: false,
        wave,
        reason: !send ? "dry-run (add ?send=1 to send)" : "RESEND_API_KEY not set",
        openGames: openCount,
        rule: `< ${UNDER * 100}% complete AND ≥ ${MIN_REMAINING} open games unpicked`,
        wouldEmail: recipients.length,
        sample: recipients.slice(0, 10).map((r) => ({ email: r.p.email, made: r.made, of: openCount })),
      });
    }

    const messages = recipients.map((r) => ({
      participantId: r.p.id,
      to: r.p.email,
      subject: bonusCatchupSubject(r.made, openCount),
      html: renderBonusCatchup({
        firstName: r.p.name.split(" ")[0] || r.p.name,
        made: r.made,
        total: openCount,
        scoreUrl: `${env.NEXT_PUBLIC_APP_URL}/picks/score`,
      }),
    }));
    const results = await sendEmailBatch(messages.map((m) => ({ to: m.to, subject: m.subject, html: m.html })));
    let sent = 0;
    for (let i = 0; i < messages.length; i++) {
      const ok = results[i];
      await repo.logScoreEmail(messages[i].participantId, templateId, ok ? "sent" : "failed");
      if (ok) sent++;
    }
    return NextResponse.json({ ok: true, sent: true, wave, report: `${sent}/${messages.length} sent` });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { BONUS_LAUNCH_SUBJECT, renderBonusLaunch } from "@/lib/email-template";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron-triggered launch sender. Vercel auto-signs the request with CRON_SECRET,
// so no human ever needs the secret — this fires from the Vercel cron schedule
// (or a manual "Run" in the Crons dashboard). Sends the "all bonus picks are
// open" email to anyone who hasn't received it.
//
// Idempotent via the SHARED "bonus-launch" log key, so it never double-sends —
// not across repeated cron runs, nor alongside the manual /api/cron/bonus-launch
// endpoint. Once everyone's been sent, every future run is a harmless no-op.

const TEMPLATE_ID = "bonus-launch";

export async function GET(req: Request) {
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(req.url).searchParams.get("secret") ??
    "";
  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const repo = await db();
    const [participants, already] = await Promise.all([
      repo.listParticipants(),
      repo.getScoreEmailRecipients(TEMPLATE_ID),
    ]);
    const recipients = participants.filter((p) => p.email && !already.has(p.id));

    if (!env.RESEND_API_KEY || recipients.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: true,
        report: `0/${recipients.length} (nothing to send — all caught up)`,
      });
    }

    const messages = recipients.map((p) => ({
      participantId: p.id,
      to: p.email,
      html: renderBonusLaunch({
        firstName: p.name.split(" ")[0] || p.name,
        scoreUrl: `${env.NEXT_PUBLIC_APP_URL}/picks/score`,
      }),
    }));
    const results = await sendEmailBatch(
      messages.map((m) => ({ to: m.to, subject: BONUS_LAUNCH_SUBJECT, html: m.html })),
    );
    let sent = 0;
    for (let i = 0; i < messages.length; i++) {
      const ok = results[i];
      await repo.logScoreEmail(messages[i].participantId, TEMPLATE_ID, ok ? "sent" : "failed");
      if (ok) sent++;
    }
    return NextResponse.json({ ok: true, sent: true, report: `${sent}/${messages.length} sent` });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import {
  SCORE_PICK_ANNOUNCEMENT_SUBJECT,
  SCORE_PICK_ANNOUNCEMENT_TEMPLATE_ID,
  renderScorePickAnnouncement,
} from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends the bonus score pick announcement once to every registered La Copa
// participant. Idempotent via the score_email_log table: if a participant
// already received this template, we skip them. Protected by CRON_SECRET.
//
// ?dry=1 → report who would receive the email without sending or logging.
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
  if (!dry && !env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, skipped: "RESEND_API_KEY not set — email service is off." });
  }

  try {
    const repo = await db();
    const [participants, alreadySent] = await Promise.all([
      repo.listParticipants(),
      repo.getScoreEmailRecipients(SCORE_PICK_ANNOUNCEMENT_TEMPLATE_ID),
    ]);

    const pending = participants.filter((p) => !alreadySent.has(p.id));

    if (dry) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        total: participants.length,
        alreadySent: alreadySent.size,
        willSend: pending.length,
      });
    }

    const html = renderScorePickAnnouncement({ appUrl: env.NEXT_PUBLIC_APP_URL });
    let sent = 0;
    let failed = 0;

    for (const p of pending) {
      const ok = await sendEmail({
        to: p.email,
        subject: SCORE_PICK_ANNOUNCEMENT_SUBJECT,
        html,
      }).catch(() => false);
      const status = ok ? "sent" : "failed";
      await repo.logScoreEmail(p.id, SCORE_PICK_ANNOUNCEMENT_TEMPLATE_ID, status);
      if (ok) sent++;
      else failed++;
    }

    return NextResponse.json({
      ok: true,
      total: participants.length,
      sent,
      failed,
      skipped: alreadySent.size,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

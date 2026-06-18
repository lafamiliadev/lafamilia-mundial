import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { BONUS_LAUNCH_SUBJECT, renderBonusLaunch } from "@/lib/email-template";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time "all bonus picks are open" announcement. Manually triggered by the
// admin (not on a schedule). Protected by CRON_SECRET.
//
//  - Idempotent: each member is logged under "bonus-launch" and never re-sent.
//  - DRY by default — returns who WOULD get it. Add ?send=1 to actually send.
//  - Batch-sent so a 100+ blast never trips Resend's rate limit.

const TEMPLATE_ID = "bonus-launch";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ?? url.searchParams.get("secret") ?? "";
  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const send = url.searchParams.get("send") === "1";

  try {
    const repo = await db();
    const [participants, already] = await Promise.all([
      repo.listParticipants(),
      repo.getScoreEmailRecipients(TEMPLATE_ID),
    ]);
    const recipients = participants.filter((p) => p.email && !already.has(p.id));

    if (!send || !env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        sent: false,
        reason: !send ? "dry-run (add ?send=1 to send)" : "RESEND_API_KEY not set",
        alreadySent: already.size,
        wouldEmail: recipients.length,
        sample: recipients.slice(0, 10).map((p) => p.email),
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

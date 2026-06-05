import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { now } from "@/lib/preview";
import { dueReminderCampaigns, type ReminderRecipient } from "@/lib/reminders";
import { teamName } from "@/lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reminder emails. Triggered by Vercel Cron (vercel.json), protected by
// CRON_SECRET. Each campaign fires once, when its time arrives, to everyone.
//
// Idempotent via settings.sentReminders. No-op (marks nothing) until
// RESEND_API_KEY is set, so due campaigns fire on the first run after email
// is switched on — nothing is silently "sent" into a void.
//
// ?dry=1 → report which campaigns are due + recipient count, without sending
// or marking. Works even without RESEND_API_KEY, for verification.
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
    const [settings, participants, scores, results] = await Promise.all([
      repo.getSettings(),
      repo.listParticipants(),
      repo.getScores(),
      repo.getResults(),
    ]);
    const nowMs = (await now()).getTime();
    const sent = settings.sentReminders ?? [];

    const due = dueReminderCampaigns(
      {
        lockTimeIso: settings.lockTime,
        appUrl: env.NEXT_PUBLIC_APP_URL,
        total: participants.length,
        champion: results.champion ? teamName(results.champion) : null,
      },
      nowMs,
      sent,
    );

    // A campaign more than ~36h overdue is "stale" — too late to be useful (e.g.
    // a round-open email after the round closed). Mark it sent but don't email,
    // so turning email on late (or a missed run) never floods inboxes with old
    // or irrelevant reminders. 36h comfortably covers the daily cron gap.
    const FRESH_MS = 36 * 60 * 60 * 1000;
    const isStale = (dueAtMs: number) => nowMs - dueAtMs > FRESH_MS;

    if (dry) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        nowIso: new Date(nowMs).toISOString(),
        recipients: participants.length,
        willSend: due.filter((c) => !isStale(c.dueAtMs)).map((c) => c.key),
        markStaleSkip: due.filter((c) => isStale(c.dueAtMs)).map((c) => c.key),
      });
    }

    const report: Record<string, string> = {};
    const newlySent: string[] = [];
    for (const c of due) {
      if (isStale(c.dueAtMs)) {
        report[c.key] = "stale — skipped";
        newlySent.push(c.key);
        continue;
      }
      let okCount = 0;
      for (const p of participants) {
        const rec: ReminderRecipient = {
          firstName: p.name.split(" ")[0] || p.name,
          rank: scores[p.id]?.rank ?? 0,
        };
        const subject = typeof c.subject === "function" ? c.subject(rec) : c.subject;
        const ok = await sendEmail({ to: p.email, subject, html: c.render(rec) }).catch(() => false);
        if (ok) okCount++;
      }
      report[c.key] = `${okCount}/${participants.length}`;
      newlySent.push(c.key); // mark sent even on partial failure — don't re-spam
    }
    if (newlySent.length) {
      await repo.saveSettings({ ...settings, sentReminders: [...sent, ...newlySent] });
    }

    return NextResponse.json({ ok: true, nowIso: new Date(nowMs).toISOString(), sent: report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

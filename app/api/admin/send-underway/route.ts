import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail, sendEmailBatch } from "@/lib/email";
import {
  TOURNAMENT_UNDERWAY_TEMPLATE_ID,
  formatDeadline,
  renderTournamentUnderway,
  tournamentUnderwaySubject,
  type UnderwayParams,
} from "@/lib/email-template";
import { now } from "@/lib/preview";
import { openScoreMatches } from "@/lib/score-picks";
import { teamName } from "@/lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-off "tournament underway, keep playing" broadcast. Manual, admin-only,
// idempotent (logs to score_email_log so a re-run never double-sends). NOT on a
// cron. Modes: ?dryRun=1 (no send — counts + sample renders), ?testTo=<email>
// (one personalized test, not logged), or a plain POST (the real send).
//
// POST /api/admin/send-underway[?dryRun=1|&testTo=you@x.com]
// Auth: Authorization: Bearer <ADMIN_PASSWORD>

const BASE = "https://wc26.lafamiliafoundation.com";
const CHAT_URL = "[ADD CHAT LINK HERE]";

export async function POST(req: Request) {
  const provided = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (provided !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const testTo = url.searchParams.get("testTo");

  const repo = await db();
  const [participants, scores, settings, results, allScoreMatches, alreadySent] = await Promise.all([
    repo.listParticipants(),
    repo.getScores(),
    repo.getSettings(),
    repo.getResults(),
    repo.getScoreMatches(),
    repo.getScoreEmailRecipients(TOURNAMENT_UNDERWAY_TEMPLATE_ID),
  ]);
  const nowMs = (await now()).getTime();

  // Who advanced from groups (the 32 R32 teams) + recorded knockout winners.
  const r32Teams = new Set<string>();
  for (const m of settings.liveMatches) {
    if (m.round === "r32") {
      r32Teams.add(m.homeCode);
      r32Teams.add(m.awayCode);
    }
  }
  const r32Complete = r32Teams.size >= 32;
  const matchWinners = results.matchWinners ?? {};
  const liveByMatch = new Map(settings.liveMatches.map((m) => [m.matchId, m]));

  // Open score matches + who already predicted each (a few queries, not 115).
  const openMatches = openScoreMatches(allScoreMatches, nowMs);
  const predictedByMatch = new Map<string, Set<string>>();
  for (const m of openMatches) {
    predictedByMatch.set(m.matchId, new Set(await repo.getScorePredictionParticipantIds(m.matchId)));
  }
  // Referral counts keyed by the referrer's slug.
  const referralCounts = new Map<string, number>();
  for (const x of participants) {
    if (x.referredBy) referralCounts.set(x.referredBy, (referralCounts.get(x.referredBy) ?? 0) + 1);
  }

  const buildParams = (p: (typeof participants)[number]): UnderwayParams => {
    const s = scores[p.id];
    const champion = p.predictions.champion ?? null;
    // 100%-sure champion status only: OUT if it lost a recorded knockout match,
    // or the full R32 is known and the champion isn't in it. ALIVE if it's in
    // the R32 and hasn't lost. Otherwise neither (neutral copy).
    const lostKnockout =
      !!champion &&
      Object.entries(matchWinners).some(([mid, w]) => {
        const lm = liveByMatch.get(mid);
        return !!lm && (lm.homeCode === champion || lm.awayCode === champion) && w !== champion;
      });
    const inR32 = !!champion && r32Teams.has(champion);
    const championOut = !!champion && (lostKnockout || (r32Complete && !inR32));
    const championAlive = !!champion && inR32 && !lostKnockout;

    const openUnsubmitted = openMatches.filter((m) => !predictedByMatch.get(m.matchId)?.has(p.id));
    const nextOpen = openUnsubmitted[0] ?? null;

    return {
      firstName: (p.name ?? "").split(" ")[0] ?? "",
      rank: s?.rank ?? null,
      total: s?.total ?? null,
      championName: champion ? teamName(champion) : null,
      championOut,
      championAlive,
      hasPoints: (s?.total ?? 0) > 0,
      nextOpenMatchLabel: nextOpen ? `${nextOpen.teamA} vs ${nextOpen.teamB}` : null,
      nextOpenKickoffLabel: nextOpen ? formatDeadline(nextOpen.kickoffUtc) : null,
      caughtUpOnScores: openMatches.length > 0 && openUnsubmitted.length === 0,
      scoreUrl: `${BASE}/picks/score?me=${p.resumeToken}`,
      liveUrl: `${BASE}/picks/live?token=${p.resumeToken}`,
      referralCount: referralCounts.get(p.slug) ?? 0,
      playUrl: BASE,
      chatUrl: CHAT_URL,
    };
  };

  // ── Test: one personalized email to a specific address, never logged. ──
  if (testTo) {
    const target =
      participants.find((p) => p.email?.toLowerCase() === testTo.toLowerCase()) ?? participants[0];
    if (!target) return NextResponse.json({ ok: false, error: "No participants" }, { status: 400 });
    const params = buildParams(target);
    const subject = `[TEST] ${tournamentUnderwaySubject(params)}`;
    const ok = await sendEmail({ to: testTo, subject, html: renderTournamentUnderway(params) });
    return NextResponse.json({ ok, mode: "test", to: testTo, personalizedFor: target.name, subject });
  }

  // Working set: everyone with an email who hasn't already been sent this.
  const recipients = participants.filter((p) => p.email && !alreadySent.has(p.id));

  // ── Dry run: no send, no log — counts + representative sample renders. ──
  if (dryRun) {
    const sample = (pred: (q: UnderwayParams) => boolean) => {
      const hit = recipients.map(buildParams).find(pred);
      return hit ? { subject: tournamentUnderwaySubject(hit), html: renderTournamentUnderway(hit) } : null;
    };
    return NextResponse.json({
      ok: true,
      mode: "dryRun",
      totalParticipants: participants.length,
      alreadySent: alreadySent.size,
      wouldSend: recipients.length,
      missingEmail: participants.filter((p) => !p.email).length,
      samples: {
        championAliveWithPoints: sample((q) => q.championAlive && q.hasPoints),
        championOutWithPoints: sample((q) => q.championOut && q.hasPoints),
        zeroPoints: sample((q) => !q.hasPoints),
        caughtUpOnScores: sample((q) => q.caughtUpOnScores),
      },
    });
  }

  // ── Real send: render + batch, then log only the successes. ──
  const built = recipients.map((p) => ({ p, params: buildParams(p) }));
  const oks = await sendEmailBatch(
    built.map(({ p, params }) => ({
      to: p.email as string,
      subject: tournamentUnderwaySubject(params),
      html: renderTournamentUnderway(params),
    })),
  );
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < built.length; i++) {
    if (oks[i]) {
      sent++;
      await repo.logScoreEmail(built[i].p.id, TOURNAMENT_UNDERWAY_TEMPLATE_ID, "sent");
    } else {
      failed++;
    }
  }
  return NextResponse.json({ ok: true, mode: "send", sent, failed, skippedAlreadySent: alreadySent.size });
}

import Link from "next/link";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { getSessionParticipant } from "@/lib/session";
import { now } from "@/lib/preview";
import { bonusPointsRemaining, pickStatus } from "@/lib/schedule";

function whenLabel(iso: string, nowMs: number): string {
  const days = Math.ceil((new Date(iso).getTime() - nowMs) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/**
 * A thin, persistent "what's my next action" bar for returning members. Hidden
 * for first-time visitors (no cookie) and once the tournament is over. Derived
 * entirely from the schedule + lock time.
 */
export async function StatusBar() {
  const me = await getSessionParticipant();
  if (!me) return null;

  const repo = await db();
  const settings = await repo.getSettings();
  const nowD = await now();
  const status = pickStatus(nowD, settings.lockTime);
  // Is there a score prediction open right now? That's the live, earn-today path
  // during the group stage — it must take priority over "knockouts in N days".
  const nextScore = (await repo.getUpcomingScoreMatches(nowD.toISOString(), 48))[0] ?? null;

  let label: string;
  let href = "/picks";
  let live = false;
  if (status.state === "bonus-open") {
    const left = bonusPointsRemaining(me.predictions.bonus, settings.weights);
    label = left > 0 ? `Make your Bonus Picks · ${left} pts` : "Bonus Picks done — edit until kickoff";
    live = true;
  } else if (nextScore) {
    // Group stage: predict the score to earn now (not "nothing for N days").
    label = `Predict the score: ${nextScore.teamA} vs ${nextScore.teamB} · +3 pts`;
    href = "/picks/score";
    live = true;
  } else if (LIVE_PICKS_ENABLED && status.state === "round-open") {
    label = `${status.round.label} — pick who advances · ${status.round.pointsInPlay} pts`;
    live = true;
  } else if (LIVE_PICKS_ENABLED && status.state === "round-soon") {
    label = `Knockouts open ${whenLabel(status.round.opensIso, nowD.getTime())} · ${status.round.pointsInPlay} pts`;
  } else {
    // No actionable bar (tournament done, or nothing open right now).
    return null;
  }

  return (
    <Link
      href={href}
      className={`block px-4 py-2 text-center text-xs font-bold ${
        live ? "bg-[var(--color-pitch)] text-white" : "bg-[var(--color-navy)] text-white"
      }`}
    >
      {live ? "⚡ " : "⏰ "}
      {label} →
    </Link>
  );
}

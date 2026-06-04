import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionParticipant } from "@/lib/session";
import { bonusPointsRemaining, pickStatus } from "@/lib/schedule";

function whenLabel(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
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
  const status = pickStatus(new Date(), settings.lockTime);

  let label: string;
  let live = false;
  if (status.state === "bonus-open") {
    const left = bonusPointsRemaining(me.predictions.bonus, settings.weights);
    label = left > 0 ? `Bonus Picks open · ${left} pts available` : "Bonus Picks in — edit until kickoff";
    live = true;
  } else if (status.state === "round-open") {
    label = `${status.round.label} picks open · ${status.round.pointsInPlay} pts`;
    live = true;
  } else if (status.state === "round-soon") {
    label = `Next picks open ${whenLabel(status.round.opensIso)} · ${status.round.pointsInPlay} pts`;
  } else {
    return null; // tournament done
  }

  return (
    <Link
      href="/picks"
      className={`block px-4 py-2 text-center text-xs font-bold ${
        live ? "bg-[var(--color-pitch)] text-white" : "bg-[var(--color-navy)] text-white"
      }`}
    >
      {live ? "⚡ " : "⏰ "}
      {label} →
    </Link>
  );
}

import Link from "next/link";
import type { Rivalry } from "@/lib/services";

// Two small, high-emotion hooks bundled into one card:
//  1. Invite feedback — "3 of your invites are in" closes the loop so sharing
//     feels like it worked (and reinforces doing it again).
//  2. Head-to-head — one real rivalry vs the friend who invited you (or the
//     first you invited). A reason to come back and re-share.
// `tone` lets it sit on a white card (/done) or the dark hero (home).
export function InviteRivalryCard({
  signups,
  rivalry,
  tone = "light",
}: {
  signups: number;
  rivalry: Rivalry | null;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  const inviteLine =
    signups > 0
      ? `🎉 ${signups} of your invites ${signups === 1 ? "is" : "are"} in`
      : "Bring in your first 👇";
  const inviteSub =
    signups > 0
      ? "Every friend who joins counts toward the prize. Keep going."
      : "Every friend who joins from your link counts toward the prize.";

  const rivalLine = rivalry ? rivalryLine(rivalry) : null;
  const setup = rivalry
    ? rivalry.relation === "invitedYou"
      ? `${rivalry.rivalName} brought you in.`
      : `You brought in ${rivalry.rivalName}.`
    : null;

  return (
    <div
      className={
        dark
          ? "rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 backdrop-blur-sm"
          : "card p-5"
      }
    >
      <p className={`font-extrabold ${dark ? "text-white" : ""}`}>{inviteLine}</p>
      <p className={`mt-1 text-sm leading-relaxed ${dark ? "text-white/80" : "text-[var(--color-muted)]"}`}>
        {inviteSub}
      </p>

      {rivalry && (
        <div className={`mt-3 border-t pt-3 ${dark ? "border-white/15" : "border-[var(--color-line)]"}`}>
          <p className={`text-xs font-semibold ${dark ? "text-white/70" : "text-[var(--color-muted)]"}`}>
            {setup}
          </p>
          <p className={`mt-1 text-sm font-bold ${dark ? "text-white" : ""}`}>{rivalLine}</p>
        </div>
      )}

      <Link
        href="/leaderboard"
        className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${
          dark ? "text-[var(--color-gold-soft)]" : "text-[var(--color-pitch)]"
        }`}
      >
        See who&apos;s bringing the Familia →
      </Link>
    </div>
  );
}

function rivalryLine(r: Rivalry): string {
  if (!r.scoringStarted) {
    return `You vs ${r.rivalName}: even at 0 for now. First points drop soon — game on. 🔥`;
  }
  if (r.diff > 0) return `You vs ${r.rivalName}: you're ahead by ${r.diff} 🔥`;
  if (r.diff < 0) return `You vs ${r.rivalName}: you're behind by ${Math.abs(r.diff)}. Time to respond.`;
  return `You vs ${r.rivalName}: dead even. Somebody has to break it.`;
}

import Link from "next/link";

const JOIN_URL = "https://nas.io/lafamilia-foundation";

// A subtle, community-first invite for non-members who discover the game through
// a friend. Reuses the existing light-card nudge style (same as the home
// explore cards) — calm, secondary, never competing with the game actions.
export function JoinFamiliaNudge({ className = "" }: { className?: string }) {
  return (
    <Link
      href={JOIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-start gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 transition hover:border-[var(--color-pitch)] hover:shadow-sm ${className}`}
    >
      <span className="mt-0.5 shrink-0 text-xl">🤝</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[var(--color-ink)]">New to LaFamilia?</p>
        <p className="mt-0.5 text-sm leading-snug text-[var(--color-muted)]">
          If you&apos;re a founder, investor, operator, or part of the tech ecosystem, come join the
          community behind the game.
        </p>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-pitch)]">
          Join LaFamilia →
        </span>
      </div>
    </Link>
  );
}

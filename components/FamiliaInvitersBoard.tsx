import Link from "next/link";
import type { Inviter } from "@/lib/services";
import { teamFlag } from "@/lib/teams";

// "Bringing the Familia" — the one competition that's alive before any match is
// played. Ranks people purely by how many of the Familia they've brought in via
// their share link. Warm + human on purpose: nobody is a "recruiter," they're
// the person who opened the door for the next one.
export function FamiliaInvitersBoard({
  top,
  me,
  total,
  closed = false,
}: {
  top: Inviter[];
  me: Inviter | null;
  total: number;
  /** True once the game has locked — no new signups possible, so this board is
   * final, not an active race. Swaps the copy from "bring them in" to a result. */
  closed?: boolean;
}) {
  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <div className="card overflow-hidden">
      <div className="bg-[var(--color-navy)] px-5 py-5 text-center text-white">
        <p className="text-2xl">🤝</p>
        <p className="mt-1 font-black">
          Bringing the Familia{closed ? " — final" : ""}
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-white/85">
          {closed
            ? "How it finished — the members who brought the most of the Familia in before the game locked. 🎁"
            : "Every friend who joins from your link counts. Whoever brings in the most of the Familia wins a prize. 🎁"}
        </p>
      </div>

      {top.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm font-semibold">
            {closed ? "No invites were logged." : "Nobody’s brought a friend in yet."}
          </p>
          {!closed && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Be the first to open the door — share your card and get one friend in.
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-line)]">
          {top.map((r) => (
            <Link
              key={r.slug}
              href={`/copa/${r.slug}`}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-black/[0.02] ${
                r.isMe ? "bg-[var(--color-gold-soft)]/40" : ""
              }`}
            >
              <div className="w-6 text-center text-sm font-black tabular-nums text-[var(--color-muted)]">
                {r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate font-semibold">{r.name}</span>
                {r.rootingCountry && (
                  <span className="shrink-0 text-sm leading-none">{teamFlag(r.rootingCountry)}</span>
                )}
                {r.isMe && (
                  <span className="shrink-0 rounded-full bg-[var(--color-pitch)] px-2 py-0.5 text-[10px] font-bold text-white">
                    YOU
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-lg font-black tabular-nums">{r.count}</span>
                <span className="ml-1 text-xs font-semibold text-[var(--color-muted)]">
                  brought in
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Your spot, if you're not already in the visible top list. */}
      {me && !top.some((r) => r.isMe) && (
        <div className="flex items-center gap-3 border-t border-[var(--color-line)] bg-[var(--color-gold-soft)]/40 px-4 py-3">
          <div className="w-6 text-center text-sm font-black tabular-nums text-[var(--color-muted)]">
            {me.rank}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate font-semibold">{me.name}</span>
            <span className="shrink-0 rounded-full bg-[var(--color-pitch)] px-2 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-lg font-black tabular-nums">{me.count}</span>
            <span className="ml-1 text-xs font-semibold text-[var(--color-muted)]">brought in</span>
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="border-t border-[var(--color-line)] px-5 py-3 text-center text-xs font-semibold text-[var(--color-muted)]">
          {total} of the Familia joined through a friend&apos;s link.
        </div>
      )}
    </div>
  );
}

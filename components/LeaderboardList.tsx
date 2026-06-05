"use client";

import Link from "next/link";
import { useState } from "react";
import { teamFlag } from "@/lib/teams";
import type { LeaderboardRow } from "@/lib/types";

/** ▲/▼ movement since the last scoring run. */
export function Move({ delta }: { delta?: number }) {
  if (!delta) return <span className="text-xs font-semibold text-[var(--color-muted)]">–</span>;
  const up = delta > 0;
  return (
    <span
      className={`text-xs font-bold tabular-nums ${
        up ? "text-[var(--color-pitch)]" : "text-[var(--color-coral)]"
      }`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

/** A race "lane": rank + name + flag + movement, a progress bar, and the score. */
export function Lane({ r, leaderTotal }: { r: LeaderboardRow; leaderTotal: number }) {
  const pct = leaderTotal > 0 ? Math.max(4, Math.round((r.total / leaderTotal) * 100)) : 0;
  return (
    <Link
      href={`/copa/${r.slug}`}
      className={`block px-4 py-3 transition hover:bg-black/[0.02] ${r.isMe ? "bg-[var(--color-gold-soft)]/40" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-6 text-center text-sm font-black tabular-nums text-[var(--color-muted)]">
          {r.rank}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-semibold">{r.name}</span>
          {r.isMe && (
            <span className="shrink-0 rounded-full bg-[var(--color-pitch)] px-2 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm leading-none" title="Pick to win">
          🏆&nbsp;{teamFlag(r.champion)}
        </span>
        <div className="w-7 shrink-0 text-right">
          <Move delta={r.delta} />
        </div>
        <div className="w-12 shrink-0 text-right text-lg font-black tabular-nums">{r.total}</div>
        <span className="shrink-0 text-[var(--color-muted)]">›</span>
      </div>
      {/* race track */}
      <div className="mt-2 ml-9 mr-5 h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: r.rank === 1 ? "var(--color-gold)" : "var(--color-pitch)",
          }}
        />
      </div>
    </Link>
  );
}

/** Pre-kickoff row: everyone at 0, name + champion flag, no race bar. */
export function StartRow({ r }: { r: LeaderboardRow }) {
  return (
    <Link
      href={`/copa/${r.slug}`}
      className={`flex items-center gap-3 px-4 py-3 transition hover:bg-black/[0.02] ${
        r.isMe ? "bg-[var(--color-gold-soft)]/40" : ""
      }`}
    >
      <span className="w-6 text-center text-sm font-black tabular-nums text-[var(--color-muted)]">
        {r.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
      {r.isMe && (
        <span className="rounded-full bg-[var(--color-pitch)] px-2 py-0.5 text-[10px] font-bold text-white">
          YOU
        </span>
      )}
      <span className="shrink-0 text-sm leading-none" title="Pick to win">
        🏆&nbsp;{teamFlag(r.champion)}
      </span>
      <span className="shrink-0 text-sm font-semibold text-[var(--color-muted)]">0 pts</span>
      <span className="shrink-0 text-[var(--color-muted)]">›</span>
    </Link>
  );
}

/**
 * Renders a ranked list that pages through the whole field with a tappable
 * "Show more" button (no infinite scroll), and — so nobody has to hunt for
 * themselves — pins the current user's row at the bottom whenever they're
 * ranked below the rows currently shown.
 *
 * Returns a fragment; the parent supplies the card / `divide-y` wrapper so the
 * borders line up with whatever section it lives in.
 */
export function LeaderboardList({
  rows,
  variant,
  leaderTotal = 0,
  initial = 10,
  step = 20,
  pinMe = true,
}: {
  rows: LeaderboardRow[];
  variant: "start" | "race";
  leaderTotal?: number;
  initial?: number;
  step?: number;
  /** Pin the viewer's row to the bottom when they're below the visible set.
   * Off when the page already renders a dedicated "Your spot" section. */
  pinMe?: boolean;
}) {
  const [shown, setShown] = useState(initial);
  const visible = rows.slice(0, shown);
  const remaining = rows.length - visible.length;

  const Row = ({ r }: { r: LeaderboardRow }) =>
    variant === "race" ? <Lane r={r} leaderTotal={leaderTotal} /> : <StartRow r={r} />;

  // Keep the viewer findable: if they're ranked beyond what's shown, pin their
  // row to the bottom so "where am I?" is always answered in one glance.
  const meRow = rows.find((r) => r.isMe);
  const meIndex = meRow ? rows.indexOf(meRow) : -1;
  const showPin = pinMe && !!meRow && meIndex >= shown;

  return (
    <>
      {visible.map((r) => (
        <Row key={`${r.rank}-${r.name}`} r={r} />
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((s) => Math.min(rows.length, s + step))}
          className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-[var(--color-pitch)] transition hover:bg-black/[0.02]"
        >
          Show {Math.min(step, remaining)} more
          <span className="font-semibold text-[var(--color-muted)]">· {remaining} below</span>
        </button>
      )}

      {showPin && meRow && (
        <>
          <div className="bg-[var(--color-gold-soft)]/30 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Your spot
          </div>
          <Row r={meRow} />
        </>
      )}
    </>
  );
}

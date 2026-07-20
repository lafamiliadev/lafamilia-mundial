"use client";

import { openLedger } from "@/components/LedgerDrawer";
import { teamFlag } from "@/lib/teams";
import type { LeaderboardRow } from "@/lib/types";

// The top-3 stand. Tapping a winner opens their full points ledger (the same
// bottom sheet every leaderboard row uses) — how every point was earned, for
// full transparency. The bracket link lives inside the sheet.

const PODIUM = [
  { medal: "🥇", color: "#f5b301", bar: "h-24", ring: "ring-[#f5b301]" },
  { medal: "🥈", color: "#c2c7d0", bar: "h-16", ring: "ring-[#c2c7d0]" },
  { medal: "🥉", color: "#cd7f32", bar: "h-12", ring: "ring-[#cd7f32]" },
];

export function Podium({ rows }: { rows: LeaderboardRow[] }) {
  // Visual order places #1 in the center: [2nd, 1st, 3rd].
  const order = [rows[1], rows[0], rows[2]];
  const placeFor = (r: LeaderboardRow) => rows.indexOf(r); // 0,1,2
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {order.map((r, i) => {
        if (!r) return <div key={i} />;
        const place = placeFor(r);
        const p = PODIUM[place];
        return (
          <button
            key={r.name + i}
            type="button"
            onClick={() => openLedger({ slug: r.slug, name: r.name })}
            className="flex flex-col items-center"
            aria-label={`See how ${r.name} earned ${r.total} points`}
          >
            {place === 0 && <div className="text-xl leading-none">👑</div>}
            <div
              className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl ring-2 ${p.ring}`}
            >
              {p.medal}
            </div>
            <p className="max-w-full truncate text-center text-sm font-bold underline-offset-4 hover:underline">
              {r.name}
            </p>
            <p className="text-xs text-[var(--color-muted)]" title="Pick to win">
              🏆 {teamFlag(r.champion)}
            </p>
            <p className="text-sm font-black tabular-nums">{r.total} pts</p>
            <div
              className={`mt-2 flex w-full ${p.bar} items-start justify-center rounded-t-xl pt-2 text-lg font-black text-white`}
              style={{ background: p.color }}
            >
              {place + 1}
            </div>
          </button>
        );
      })}
    </div>
  );
}

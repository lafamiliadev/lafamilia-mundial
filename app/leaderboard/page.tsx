import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { SiembraBanner } from "@/components/Siembra";
import { LinkButton, PageShell, SectionTitle, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { getLeaderboardData } from "@/lib/services";
import { nextScoringMilestone } from "@/lib/schedule";
import { teamFlag } from "@/lib/teams";
import { DEFAULT_WEIGHTS, type LeaderboardRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard · La Copa de LaFamilia 2026" };

const PODIUM = [
  { medal: "🥇", color: "#f5b301", bar: "h-24", ring: "ring-[#f5b301]" },
  { medal: "🥈", color: "#c2c7d0", bar: "h-16", ring: "ring-[#c2c7d0]" },
  { medal: "🥉", color: "#cd7f32", bar: "h-12", ring: "ring-[#cd7f32]" },
];

/** ▲/▼ movement since the last scoring run. */
function Move({ delta }: { delta?: number }) {
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

/** A race "lane": name + flag + movement, a progress bar, and the score. */
function Lane({ r, leaderTotal }: { r: LeaderboardRow; leaderTotal: number }) {
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
          <span className="shrink-0 text-base leading-none">{teamFlag(r.rootingCountry)}</span>
          <span className="truncate font-semibold">{r.name}</span>
          {r.isMe && (
            <span className="shrink-0 rounded-full bg-[var(--color-pitch)] px-2 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </div>
        <div className="w-8 shrink-0 text-right">
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

function Podium({ rows }: { rows: LeaderboardRow[] }) {
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
          <Link key={r.name + i} href={`/copa/${r.slug}`} className="flex flex-col items-center">
            {place === 0 && <div className="text-xl leading-none">👑</div>}
            <div
              className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl ring-2 ${p.ring}`}
            >
              {p.medal}
            </div>
            <p className="max-w-full truncate text-center text-sm font-bold underline-offset-4 hover:underline">
              {r.name}
            </p>
            <p className="text-xs font-semibold text-[var(--color-muted)]">{r.total} pts</p>
            <div
              className={`mt-2 flex w-full ${p.bar} items-start justify-center rounded-t-xl pt-2 text-lg font-black text-white`}
              style={{ background: p.color }}
            >
              {place + 1}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ me?: string }>;
}) {
  const { me: token } = await searchParams;
  const { total, top, me, leaderTotal, meGapToNext, scoringStarted } =
    await getLeaderboardData(token);
  const nextDrop = nextScoringMilestone(new Date());
  const repo = await db();
  const settings = await repo.getSettings();
  const honorsLive = settings.awardsRevealed ?? false;
  const w = settings.weights ?? DEFAULT_WEIGHTS;

  const podiumRows = top.slice(0, 3);
  const chasers = top.slice(3);

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="leaderboard" />
      <PageShell>
        <div className="py-6">
          <SectionTitle emoji="🏆">The Race</SectionTitle>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {total} predicting. <strong>Top 3 take home prizes</strong> 🏅
          </p>
          {total > 0 && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">Tap anyone to see their bracket.</p>
          )}
        </div>

        {/* Mission, front and center — supporting Siembra is why we play. */}
        <div className="mb-5">
          <SiembraBanner />
        </div>

        {honorsLive && (
          <Link
            href="/awards"
            className="mb-5 flex items-center justify-between rounded-2xl bg-[var(--color-gold-soft)]/50 px-4 py-3 font-semibold"
          >
            <span>🏆 The Familia Honors are in</span>
            <span className="text-sm">See the winners →</span>
          </Link>
        )}

        {/* Next points drop — the anticipation engine */}
        {nextDrop && (
          <div className="mb-5 rounded-2xl bg-[var(--color-navy)] px-4 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
              ⚡ Next points drop · {nextDrop.pointsInPlay} pts in play
            </p>
            <p className="text-sm font-semibold">{nextDrop.label}</p>

            {/* Quiet, tap-to-expand scoring explainer */}
            <details className="mt-1">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-[var(--color-gold-soft)] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                ⓘ How points work
              </summary>
              <div className="mt-2 rounded-xl bg-white/10 p-3 text-sm">
                <ul className="space-y-1.5">
                  <li className="flex items-center justify-between gap-3">
                    <span>🥇 Group winners</span>
                    <span className="font-semibold">{w.groupWinner} each · up to {w.groupWinner * 12}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>🎯 Final Four</span>
                    <span className="font-semibold">{w.semifinalist} each · up to {w.semifinalist * 4}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>🏆 Champion</span>
                    <span className="font-semibold">{w.champion}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>🧹 All 12 groups right</span>
                    <span className="font-semibold">+{w.groupSweepBonus}</span>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-white/70">
                  Ties are broken by your goals-in-the-final guess.
                </p>
                <p className="mt-1 text-xs font-semibold">
                  Sharpest read across the whole tournament wins — not just the champion.
                </p>
              </div>
            </details>

            <div className="mt-3">
              <Countdown lockTime={nextDrop.dateIso} />
            </div>
          </div>
        )}

        {total === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl">🫥</div>
            <p className="mt-3 font-bold">No predictors yet</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Be the first on the starting line.</p>
            <LinkButton href="/play" variant="primary" className="mt-5 w-full">
              Make your predictions →
            </LinkButton>
          </div>
        ) : !scoringStarted ? (
          // ── Starting line: nobody has scored yet ──
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-pitch)] px-4 py-4 text-center text-white">
              <p className="text-2xl">🏁</p>
              <p className="mt-1 font-black">At the starting line</p>
              <p className="mt-1 text-sm text-white/85">
                Everyone&apos;s at zero. The race starts when the first points land
                {nextDrop ? `, ${nextDrop.label.toLowerCase()}.` : " soon."}
              </p>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {top.map((r) => (
                <Link
                  href={`/copa/${r.slug}`}
                  key={`${r.rank}-${r.name}`}
                  className={`flex items-center gap-3 px-4 py-3 transition hover:bg-black/[0.02] ${
                    r.isMe ? "bg-[var(--color-gold-soft)]/40" : ""
                  }`}
                >
                  <span className="text-base leading-none">{teamFlag(r.rootingCountry)}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                  {r.isMe && (
                    <span className="rounded-full bg-[var(--color-pitch)] px-2 py-0.5 text-[10px] font-bold text-white">
                      YOU
                    </span>
                  )}
                  <span className="text-sm font-semibold text-[var(--color-muted)]">0 pts</span>
                  <span className="text-[var(--color-muted)]">›</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          // ── Live race ──
          <>
            {podiumRows.length >= 1 && (
              <div className="card p-4">
                <Podium rows={podiumRows} />
                <p className="mt-3 text-center text-xs font-semibold text-[var(--color-muted)]">
                  Top 3 win. The whole board&apos;s still in play.
                </p>
              </div>
            )}

            {chasers.length > 0 && (
              <div className="card mt-4 divide-y divide-[var(--color-line)] overflow-hidden">
                <div className="bg-black/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  The chase
                </div>
                {chasers.map((r) => (
                  <Lane key={`${r.rank}-${r.name}`} r={r} leaderTotal={leaderTotal} />
                ))}
              </div>
            )}

            {/* Your position + the gap to catch */}
            {me && me.rank > 3 && (
              <>
                <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Your spot
                </p>
                <div className="card overflow-hidden">
                  <Lane r={me} leaderTotal={leaderTotal} />
                </div>
                {meGapToNext != null && meGapToNext > 0 && (
                  <p className="mt-2 text-center text-sm font-semibold text-[var(--color-ink)]">
                    {meGapToNext} {meGapToNext === 1 ? "point" : "points"} behind #{me.rank - 1}. Catchable. 🔥
                  </p>
                )}
              </>
            )}
          </>
        )}

        {!token && total > 0 && (
          <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
            Open your private link to find yourself on the board.
          </p>
        )}
      </PageShell>
    </main>
  );
}

import { LinkButton, PageShell, SectionTitle, TopNav } from "@/components/ui";
import { getLeaderboardData } from "@/lib/services";
import { teamFlag } from "@/lib/teams";
import type { LeaderboardRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard · LaFamilia Mundial 2026" };

const medal = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

function Row({ r }: { r: LeaderboardRow }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        r.isMe ? "bg-[var(--color-gold-soft)]/40" : ""
      }`}
    >
      <div className="w-8 text-center text-lg font-black tabular-nums">
        {medal(r.rank) ?? r.rank}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-semibold">{r.name}</span>
        {r.isMe && (
          <span className="shrink-0 rounded-full bg-[var(--color-pitch)] px-2 py-0.5 text-[10px] font-bold text-white">
            YOU
          </span>
        )}
      </div>
      <div className="shrink-0 text-xl leading-none">{teamFlag(r.rootingCountry)}</div>
      <div className="w-14 shrink-0 text-right font-black tabular-nums">{r.total}</div>
    </div>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ me?: string }>;
}) {
  const { me: token } = await searchParams;
  const { total, top, me } = await getLeaderboardData(token);

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="leaderboard" />
      <PageShell>
        <div className="py-6">
          <SectionTitle emoji="🏆">Leaderboard</SectionTitle>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {total} {total === 1 ? "predictor" : "predictors"} in the running. Points grow as the
            tournament unfolds.
          </p>
        </div>

        {total === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl">🫥</div>
            <p className="mt-3 font-bold">No predictions yet</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Be the first to get on the board.
            </p>
            <LinkButton href="/play" variant="primary" className="mt-5 w-full">
              Make your predictions →
            </LinkButton>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-[var(--color-pitch)] px-4 py-3 text-white">
              <span className="text-sm font-semibold opacity-90">Total participants</span>
              <span className="text-2xl font-black tabular-nums">{total}</span>
            </div>

            <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
              <div className="bg-black/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Top 10
              </div>
              {top.map((r) => (
                <Row key={`${r.rank}-${r.name}`} r={r} />
              ))}
            </div>

            {me && me.rank > 10 && (
              <>
                <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Your ranking
                </p>
                <div className="card overflow-hidden">
                  <Row r={me} />
                </div>
              </>
            )}

            {!token && (
              <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
                Open your private link to highlight your rank here.
              </p>
            )}
          </>
        )}
      </PageShell>
    </main>
  );
}

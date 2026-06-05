import Link from "next/link";
import { LinkButton, PageShell, SectionTitle, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { getSessionParticipant } from "@/lib/session";
import { BONUS_POINTS_AVAILABLE, LIVE_ROUNDS, pickStatus } from "@/lib/schedule";
import { EMPTY_BONUS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Picks · La Copa de LaFamilia 2026" };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export default async function PicksHubPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; saved?: string }>;
}) {
  const { token, saved } = await searchParams;
  const repo = await db();
  const me = token ? await repo.getByToken(token) : await getSessionParticipant();

  if (!me) {
    return (
      <main className="flex flex-1 flex-col">
        <TopNav active="picks" />
        <PageShell>
          <div className="card mt-10 p-8 text-center">
            <div className="text-5xl">🎯</div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Your picks live here</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Make your 3-minute bracket first. Then this is where you add Bonus Picks and Live Picks
              all tournament long.
            </p>
            <LinkButton href="/play" variant="primary" className="mt-5 w-full">
              Make my bracket →
            </LinkButton>
            <Link href="/edit" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
              Already played? Find my picks
            </Link>
          </div>
        </PageShell>
      </main>
    );
  }

  const settings = await repo.getSettings();
  const nowMs = (await now()).getTime();
  const status = pickStatus(new Date(nowMs), settings.lockTime);
  const bonus = me.predictions.bonus ?? EMPTY_BONUS;
  const bonusFilled = Object.values(bonus).filter(Boolean).length;
  const bonusOpen = status.state === "bonus-open";

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="picks" />
      <PageShell>
        <div className="py-6">
          <SectionTitle emoji="🎯">Your Picks</SectionTitle>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Your original bracket stays locked. New rounds give you new chances to earn points.
          </p>
        </div>

        {saved === "bonus" && (
          <div className="mb-5 rounded-2xl bg-[var(--color-pitch)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-pitch)]">
            ✓ Bonus Picks saved. You can edit them anytime before kickoff.
          </div>
        )}

        {/* ── Open now ── */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Open now
        </p>

        {bonusOpen ? (
          <Link
            href="/picks/bonus"
            className="card mb-3 block overflow-hidden border-2 border-[var(--color-gold)] shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--color-gold-soft) 0%, var(--color-gold) 100%)" }}
              >
                {bonusFilled >= 4 ? "🎉" : "🎁"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">Bonus Picks</p>
                  <span className="shrink-0 rounded-full bg-[var(--color-gold-soft)]/70 px-2 py-0.5 text-xs font-extrabold text-[#3a2b00]">
                    +{BONUS_POINTS_AVAILABLE} pts
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  Golden Ball, Boot, Glove &amp; a Dark Horse
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-bold text-[var(--color-pitch)]">
                  {bonusFilled}/4 done
                </span>
                <span className="text-lg text-[var(--color-gold)]">›</span>
              </span>
            </div>
            <div className="bg-[var(--color-gold)] px-4 py-2.5 text-center text-sm font-bold text-[#3a2b00]">
              {bonusFilled === 0 ? "Add your Bonus Picks →" : bonusFilled < 4 ? "Finish your Bonus Picks →" : "Edit your Bonus Picks →"}
            </div>
          </Link>
        ) : status.state === "round-open" ? (
          <div className="card mb-3 overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-navy)]/10 text-2xl">
                ⚡
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{status.round.label} — Live Picks</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Pick the winners of {status.round.plain}. Locks at kickoff.
                </p>
              </div>
            </div>
            <div className="bg-[var(--color-navy)] px-4 py-2 text-center text-sm font-bold text-white">
              Opening soon — we&apos;ll remind you ⏰
            </div>
          </div>
        ) : (
          <div className="card mb-3 p-4 text-sm text-[var(--color-muted)]">
            Nothing open right now. Your next round is below — we&apos;ll remind you when it opens.
          </div>
        )}

        {/* Bracket — done + locked context */}
        <Link
          href={`/r/${me.resumeToken}`}
          className="card mb-6 flex items-center gap-4 p-4 transition hover:shadow-sm"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-cream)] text-2xl">
            ✅
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Your bracket is in</p>
            <p className="text-sm text-[var(--color-muted)]">
              {bonusOpen ? "Editable until kickoff." : "Locked for the tournament."}
            </p>
          </div>
          {bonusOpen && <span className="shrink-0 text-sm font-semibold text-[var(--color-pitch)]">Edit ›</span>}
        </Link>

        {/* ── Coming next ── */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Coming next
        </p>
        <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {LIVE_ROUNDS.map((r) => {
            const open = status.state === "round-open" && status.round.round === r.round;
            const done = Date.now() >= new Date(r.locksIso).getTime();
            return (
              <div key={r.round} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-cream)] text-sm font-black">
                  {r.round === "final" ? "🏆" : r.round.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{r.label}</p>
                  <p className="text-xs text-[var(--color-muted)]">Pick the winners of {r.plain}</p>
                </div>
                <span
                  className={
                    done
                      ? "shrink-0 text-xs font-semibold text-[var(--color-muted)]"
                      : open
                        ? "shrink-0 rounded-full bg-[var(--color-pitch)] px-2.5 py-1 text-xs font-bold text-white"
                        : "shrink-0 text-xs font-semibold text-[var(--color-muted)]"
                  }
                >
                  {done ? "Closed" : open ? "Open" : `Opens ${fmtDate(r.opensIso)}`}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
          You can climb even if your champion is eliminated. New points open every round.
        </p>

        {/* Single, clear action — grow the competition. Leaderboard lives in
            the header nav, so it isn't duplicated here. */}
        <LinkButton href={`/done?token=${me.resumeToken}`} variant="primary" className="mt-6 w-full">
          🔥 Challenge a Friend
        </LinkButton>
      </PageShell>
    </main>
  );
}

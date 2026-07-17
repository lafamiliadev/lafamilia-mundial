import Link from "next/link";
import { LinkButton, PageShell, TopNav } from "@/components/ui";
import { LivePicksWizard } from "@/components/LivePicksWizard";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { currentLiveRoundView, liveMatchOpen, liveRound, openLiveRoundViews } from "@/lib/live";
import { now, PREVIEW_ENABLED } from "@/lib/preview";
import { getSessionParticipant } from "@/lib/session";
import { kickoffLabelDual } from "@/lib/format-time";
import { LIVE_ROUND_POINTS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Picks · La Copa de LaFamilia 2026" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="picks" />
      <PageShell>
        <div className="py-6">{children}</div>
      </PageShell>
    </main>
  );
}

function Notice({
  emoji,
  title,
  body,
  cta,
}: {
  emoji: string;
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="card p-8 text-center">
      <div className="text-4xl">{emoji}</div>
      <h1 className="mt-3 text-xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{body}</p>
      {cta}
    </div>
  );
}

export default async function LivePicksPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // Hidden in production until the feature ships; testable locally via preview.
  if (!LIVE_PICKS_ENABLED && !PREVIEW_ENABLED) {
    return (
      <Shell>
        <Notice
          emoji="⚡"
          title="Live Picks are coming"
          body="A new way to earn points during the knockout rounds. We'll let you know the moment it opens."
          cta={
            <LinkButton href="/picks" variant="primary" className="mt-5 w-full">
              Back to my picks →
            </LinkButton>
          }
        />
      </Shell>
    );
  }

  const { token } = await searchParams;
  const repo = await db();
  const me = token ? await repo.getByToken(token) : await getSessionParticipant();
  if (!me) {
    return (
      <Shell>
        <Notice
          emoji="🎯"
          title="Make your bracket first"
          body="Live Picks build on your entry. Once you're in, you can pick winners every knockout round."
          cta={
            <LinkButton href="/play" variant="primary" className="mt-5 w-full">
              Make my bracket →
            </LinkButton>
          }
        />
      </Shell>
    );
  }

  const settings = await repo.getSettings();
  const nowMs = (await now()).getTime();
  // Per-game model: EVERY round with a game still open gets its own section —
  // over the closing weekend the 3rd-place game (Saturday) and the Final
  // (Sunday) are pickable at the same time. When nothing is open, fall back to
  // the latest drawn round as a locked recap. Empty = no matchups drawn yet.
  const openViews = openLiveRoundViews(settings.liveMatches, nowMs);
  const fallbackView =
    openViews.length === 0 ? currentLiveRoundView(settings.liveMatches, nowMs) : null;
  const views = openViews.length > 0 ? openViews : fallbackView ? [fallbackView] : [];
  if (views.length === 0) {
    return (
      <Shell>
        <Notice
          emoji="⏳"
          title="Live Picks open at the knockouts"
          body="They start with the Round of 32 — you'll pick who advances in each matchup, right up until each game kicks off. For now, lock in your Bonus Picks; they count toward the Overall race."
          cta={
            <LinkButton href="/picks" variant="primary" className="mt-5 w-full">
              Go to my picks →
            </LinkButton>
          }
        />
      </Shell>
    );
  }

  const allPicks = await repo.getLivePicks(me.id);
  const sections = views.map((view) => {
    const lr = liveRound(view.round);
    const roundLabel = lr?.label ?? view.round.toUpperCase();
    const plain = lr?.plain ?? "the matchups";
    const pointsEach = settings.weights[LIVE_ROUND_POINTS[view.round]];

    const savedByMatch = new Map(
      allPicks.filter((p) => p.round === view.round).map((p) => [p.matchId, p] as const),
    );

    // Order the games chronologically by kickoff — match ids are provider fixture
    // ids, so their natural order is meaningless to a player.
    const orderedMatches = [...view.matches].sort((a, b) =>
      (a.kickoffIso ?? "").localeCompare(b.kickoffIso ?? ""),
    );

    // One row per game, with its own lock state + the member's saved pick. The
    // server computes `locked` so the UI never relies on the browser clock.
    const games = orderedMatches.map((m) => {
      const saved = savedByMatch.get(m.matchId);
      return {
        matchId: m.matchId,
        homeCode: m.homeCode,
        awayCode: m.awayCode,
        locked: !liveMatchOpen(m, nowMs),
        kickoffLabel: m.kickoffIso ? kickoffLabelDual(m.kickoffIso) : null,
        savedTeam: saved?.team ?? null,
        savedHc: saved?.highConviction ?? false,
      };
    });

    // The soonest game still open in this round — drives the section countdown.
    const nextOpen = orderedMatches.find((m) => liveMatchOpen(m, nowMs)) ?? null;
    const nextUp = nextOpen
      ? { kickoffIso: nextOpen.kickoffIso, homeCode: nextOpen.homeCode, awayCode: nextOpen.awayCode }
      : null;

    return { round: view.round, roundLabel, plain, pointsEach, games, nextUp };
  });

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="picks" />
      <PageShell>
        <div className="py-5">
          <Link
            href="/picks"
            className="text-sm font-semibold text-[var(--color-muted)] underline-offset-4 hover:underline"
          >
            ← My picks
          </Link>
          <div className="mt-4 space-y-8">
            {sections.map((s) => (
              <LivePicksWizard
                key={s.round}
                token={me.resumeToken}
                round={s.round}
                roundLabel={s.roundLabel}
                plain={s.plain}
                pointsEach={s.pointsEach}
                games={s.games}
                nextUp={s.nextUp}
              />
            ))}
          </div>
        </div>
      </PageShell>
    </main>
  );
}

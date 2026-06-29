import Link from "next/link";
import { LinkButton, PageShell, TopNav } from "@/components/ui";
import { LivePicksWizard } from "@/components/LivePicksWizard";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { currentLiveRoundView, liveMatchOpen, liveRound } from "@/lib/live";
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
  // Per-game model: show the current knockout round, each game open until its
  // own kickoff. null = no knockout matchups drawn yet.
  const view = currentLiveRoundView(settings.liveMatches, nowMs);
  if (!view) {
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

  const lr = liveRound(view.round);
  const roundLabel = lr?.label ?? view.round.toUpperCase();
  const plain = lr?.plain ?? "the matchups";
  const pointsEach = settings.weights[LIVE_ROUND_POINTS[view.round]];

  const roundPicks = (await repo.getLivePicks(me.id)).filter((p) => p.round === view.round);
  const savedByMatch = new Map(roundPicks.map((p) => [p.matchId, p] as const));

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

  // The soonest game still open for picks — drives the countdown in the header.
  const nextOpen = orderedMatches.find((m) => liveMatchOpen(m, nowMs)) ?? null;
  const nextUp = nextOpen
    ? { kickoffIso: nextOpen.kickoffIso, homeCode: nextOpen.homeCode, awayCode: nextOpen.awayCode }
    : null;

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
          <div className="mt-4">
            <LivePicksWizard
              token={me.resumeToken}
              round={view.round}
              roundLabel={roundLabel}
              plain={plain}
              pointsEach={pointsEach}
              games={games}
              nextUp={nextUp}
            />
          </div>
        </div>
      </PageShell>
    </main>
  );
}

import Link from "next/link";
import { LinkButton, PageShell, TopNav } from "@/components/ui";
import { LivePicksWizard } from "@/components/LivePicksWizard";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { liveRound, matchesForRound } from "@/lib/live";
import { now, PREVIEW_ENABLED } from "@/lib/preview";
import { pickStatus } from "@/lib/schedule";
import { getSessionParticipant } from "@/lib/session";
import { LIVE_ROUND_POINTS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Picks · La Copa de LaFamilia 2026" };

function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

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
  const current = await now();
  const status = pickStatus(current, settings.lockTime);

  // Live Picks only exist during the knockout rounds.
  if (status.state === "bonus-open") {
    return (
      <Shell>
        <Notice
          emoji="⏳"
          title="Live Picks open at the knockouts"
          body="They start with the Round of 32. For now, lock in your Bonus Picks — they count toward the Overall race."
          cta={
            <LinkButton href="/picks" variant="primary" className="mt-5 w-full">
              Go to my picks →
            </LinkButton>
          }
        />
      </Shell>
    );
  }
  if (status.state === "done") {
    return (
      <Shell>
        <Notice
          emoji="🏁"
          title="The knockouts are over"
          body="All Live Picks rounds are done. See where you landed on the leaderboard."
          cta={
            <LinkButton href="/leaderboard" variant="primary" className="mt-5 w-full">
              See the leaderboard →
            </LinkButton>
          }
        />
      </Shell>
    );
  }
  if (status.state === "round-soon") {
    const r = status.round;
    return (
      <Shell>
        <Notice
          emoji="🗓️"
          title={`${r.label} picks open soon`}
          body={`Picks for ${r.plain} open ${whenLabel(r.opensIso)}. We'll remind you when they're live.`}
          cta={
            <LinkButton href="/leaderboard" variant="outline" className="mt-5 w-full">
              See the race →
            </LinkButton>
          }
        />
      </Shell>
    );
  }

  // round-open
  const r = status.round;
  const matches = matchesForRound(settings.liveMatches, r.round);
  if (matches.length === 0) {
    return (
      <Shell>
        <Notice
          emoji="🔜"
          title={`${r.label} matchups coming`}
          body="The picks open as soon as the matchups are confirmed. Check back shortly — this is usually right after the previous round finishes."
          cta={
            <LinkButton href="/picks" variant="outline" className="mt-5 w-full">
              Back to my picks →
            </LinkButton>
          }
        />
      </Shell>
    );
  }

  const allPicks = await repo.getLivePicks(me.id);
  const roundPicks = allPicks.filter((p) => p.round === r.round);
  const lr = liveRound(r.round);
  const pointsEach = settings.weights[LIVE_ROUND_POINTS[r.round]];

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
              round={r.round}
              roundLabel={r.label}
              plain={r.plain}
              locksLabel={whenLabel((lr ?? r).locksIso)}
              pointsEach={pointsEach}
              matches={matches}
              initialPicks={roundPicks}
            />
          </div>
        </div>
      </PageShell>
    </main>
  );
}

import { redirect } from "next/navigation";
import {
  AwardsAdmin,
  CopyButton,
  GenerateUpdatesButton,
  RecalcButton,
  ResultsForm,
  SyncGroupsButton,
  SyncResultsButton,
  TestEmailButton,
} from "@/components/admin";
import { Button } from "@/components/ui";
import { AdminSection } from "@/components/AdminSection";
import { InsightsBoard } from "@/components/InsightsBoard";
import { FunFactsBoard } from "@/components/FunFactsBoard";
import { LiveMatchesAdmin } from "@/components/LiveMatchesAdmin";
import { LiveResultsConfirm } from "@/components/LiveResultsConfirm";
import { ScoreMatchesAdmin } from "@/components/ScoreMatchesAdmin";
import { matchImpact } from "@/lib/live";
import { adminLogout } from "@/app/actions/admin";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getProvider } from "@/lib/football";
import { getAwards, getScoreMatchAdminView } from "@/lib/services";
import { teamFlag, teamName } from "@/lib/teams";
import type { ProviderStatus } from "@/lib/football";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard · La Copa de LaFamilia 2026" };

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const repo = await db();
  const [participants, scores, settings, results, content, awards, livePicksByUser, scoreMatchRows] =
    await Promise.all([
      repo.listParticipants(),
      repo.getScores(),
      repo.getSettings(),
      repo.getResults(),
      repo.listContent(),
      getAwards(),
      repo.listLivePicks(),
      getScoreMatchAdminView(),
    ]);

  // Impact preview for the foolproof results-confirm screen: who picked each
  // side of every match and how many points each outcome would award.
  const allLivePicks = Object.values(livePicksByUser).flat();
  const liveImpacts = [...settings.liveMatches]
    .sort((a, b) => a.matchId.localeCompare(b.matchId, undefined, { numeric: true }))
    .map((m) => matchImpact(m, allLivePicks, settings.weights, results.matchWinners));

  let status: ProviderStatus;
  try {
    status = await getProvider().status();
  } catch (e) {
    status = {
      provider: env.FOOTBALL_API_PROVIDER,
      ok: false,
      detail: (e as Error).message,
      fetchedAt: new Date().toISOString(),
    };
  }

  const ranked = [...participants].sort(
    (a, b) => (scores[b.id]?.total ?? 0) - (scores[a.id]?.total ?? 0),
  );

  // Referral metrics
  const signupsByRef = new Map<string, number>();
  for (const p of participants) {
    if (p.referredBy) signupsByRef.set(p.referredBy, (signupsByRef.get(p.referredBy) ?? 0) + 1);
  }
  const referredJoins = participants.filter((p) => p.referredBy).length;
  const totalVisits = participants.reduce((s, p) => s + (p.referralVisits ?? 0), 0);
  const topReferrers = [...signupsByRef.entries()]
    .map(([refSlug, count]) => ({
      name: participants.find((p) => p.slug === refSlug)?.name ?? refSlug,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24">
      <header className="flex items-center justify-between py-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Control room ⚙️</h1>
          <p className="text-sm text-[var(--color-muted)]">La Copa de LaFamilia 2026</p>
        </div>
        <form action={adminLogout}>
          <Button variant="ghost" type="submit" className="min-h-0 px-4 py-2 text-sm">
            Log out
          </Button>
        </form>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Participants", value: participants.length },
          { label: "Referred joins", value: referredJoins },
          { label: "Share-page visits", value: totalVisits },
          { label: "Scored entries", value: Object.keys(scores).length },
          { label: "Champion set", value: results.champion ? teamName(results.champion) : "—" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Tap a section to open it
      </p>

      {/* Bonus score predictions — link to API, confirm the score, award points.
          Shadow-first: the API score is shown for confirmation; nothing is
          awarded until you click. Manual entry is always available as fallback. */}
      <AdminSection emoji="🎲" title="Bonus score matches" defaultOpen>
        <p className="text-sm text-[var(--color-muted)]">
          {status.provider === "api-football"
            ? "Final scores come from API-Football. Link the matches, then confirm each result to award points — the leaderboard updates right away. If the API is missing or wrong, enter the score by hand. Nothing is awarded automatically yet."
            : "Final scores for these matches are entered by hand on the free provider. Set API-Football to pull scores automatically. Enter each result below to award points."}
        </p>
        <div className="mt-4">
          <ScoreMatchesAdmin rows={scoreMatchRows} />
        </div>
      </AdminSection>

      {/* Live Picks — Step 2: confirm who advanced (foolproof, plain-language) */}
      <AdminSection emoji="✅" title="Live Picks — confirm results" defaultOpen>
        <p className="text-sm text-[var(--color-muted)]">
          {status.provider === "api-football"
            ? "Results sync automatically from API-Football every day. Tap below to update instantly, or confirm any match by hand — your choice always wins."
            : "After each knockout game, confirm which team advanced. Tap Check the result to see who won, pick the team, and review the points before saving."}
        </p>
        {status.provider === "api-football" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SyncResultsButton />
            <span className="text-xs text-[var(--color-muted)]">
              {settings.liveMatchesSyncedAt
                ? `Matchups last synced ${new Date(settings.liveMatchesSyncedAt).toLocaleString()}`
                : "Not synced yet — runs once the knockout draw is set."}
            </span>
          </div>
        )}
        <div className="mt-4">
          <LiveResultsConfirm impacts={liveImpacts} />
        </div>
      </AdminSection>

      {/* Live Picks — Step 1: set the matchups */}
      <AdminSection emoji="⚽" title="Live Picks — set matchups">
        <p className="text-sm text-[var(--color-muted)]">
          Set each knockout round&apos;s matchups (who plays whom) once the bracket is known, so
          members can pick winners. Confirm the results in the section above.
          {settings.liveMatches.length === 0 ? " No matchups entered yet." : ""}
        </p>
        <div className="mt-4">
          <LiveMatchesAdmin initialMatches={settings.liveMatches} />
        </div>
      </AdminSection>

      {/* Results editor */}
      <AdminSection emoji="🎯" title="Tournament results">
        <p className="text-sm text-[var(--color-muted)]">
          Auto-pulled by the scoring cron; edit here to override. Saving recomputes every score.
        </p>
        <div className="mt-4">
          <ResultsForm initial={results} />
        </div>
      </AdminSection>

      {/* Tournament setup — group draw */}
      <AdminSection emoji="🌐" title="Tournament setup">
        <p className="text-sm text-[var(--color-muted)]">
          {Object.keys(settings.groups ?? {}).length === 12
            ? `All 12 groups loaded${settings.groupsSyncedAt ? ` · synced ${new Date(settings.groupsSyncedAt).toLocaleString()}` : ""}. Verify they match the official draw below.`
            : `${Object.keys(settings.groups ?? {}).length}/12 groups loaded — sync the draw so members can pick group winners.`}
        </p>
        <div className="mt-4">
          <SyncGroupsButton />
        </div>
        {Object.keys(settings.groups ?? {}).length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.keys(settings.groups)
              .sort()
              .map((letter) => (
                <div key={letter} className="rounded-xl border border-[var(--color-line)] p-2 text-sm">
                  <p className="text-xs font-bold uppercase text-[var(--color-muted)]">Group {letter}</p>
                  <p className="mt-1">
                    {(settings.groups[letter] ?? []).map((c) => teamFlag(c)).join(" ")}
                  </p>
                </div>
              ))}
          </div>
        )}
      </AdminSection>

      {/* Referral leaderboard — a SEPARATE challenge (not part of the winner total) */}
      {topReferrers.length > 0 && (
        <AdminSection emoji="🔗" title="Referrals (separate challenge)">
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            A side challenge — these points do not count toward the main leaderboard total.
          </p>
          <ul className="space-y-2">
            {topReferrers.map((r, i) => (
              <li key={r.name} className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {i + 1}. {r.name}
                </span>
                <span className="tabular-nums text-[var(--color-muted)]">
                  {r.count} {r.count === 1 ? "join" : "joins"}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      {/* API status + actions */}
      <AdminSection emoji="🛰️" title="API status & tools">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              status.ok ? "bg-[var(--color-pitch)]" : "bg-[var(--color-coral)]"
            }`}
          />
          <div className="text-sm">
            <p className="font-semibold">
              Provider: {status.provider} {status.ok ? "· healthy" : "· unavailable"}
            </p>
            <p className="text-[var(--color-muted)]">{status.detail}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <RecalcButton />
          <a href="/api/admin/export?kind=participants" className="inline-block">
            <Button variant="outline">⬇ Export participants CSV</Button>
          </a>
          <a href="/api/admin/export?kind=leaderboard" className="inline-block">
            <Button variant="outline">⬇ Export leaderboard CSV</Button>
          </a>
        </div>
      </AdminSection>

      {/* Email check — confirm Resend delivery without touching members */}
      <AdminSection emoji="📧" title="Email check">
        <p className="text-sm text-[var(--color-muted)]">
          Send one of every email design to yourself to confirm delivery works. Members are not
          touched — this only emails the address you type.
        </p>
        <div className="mt-4">
          <TestEmailButton />
        </div>
      </AdminSection>

      {/* La Familia Honors */}
      <AdminSection emoji="🏆" title="La Familia Honors">
        <p className="text-sm text-[var(--color-muted)]">
          Preview the awards, then reveal them on /awards for the finale.
        </p>
        <div className="mt-4">
          <AwardsAdmin awards={awards} revealed={settings.awardsRevealed ?? false} />
        </div>
      </AdminSection>

      {/* Fun Facts — casual, group-chat-ready observations for WhatsApp.
          Internal only; not awards, not analytics. Players never see this. */}
      <AdminSection emoji="🎉" title="Fun Facts">
        <p className="text-sm text-[var(--color-muted)]">
          Internal — funny, surprising patterns in the picks to drop in WhatsApp. Tap{" "}
          <strong>Copy</strong> on any one to grab the ready-to-paste version. Not awards, just
          conversation starters. Refreshes every time you load this page.
        </p>
        <div className="mt-4">
          <FunFactsBoard
            participants={participants}
            dateLabel={new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "America/New_York",
            })}
          />
        </div>
      </AdminSection>

      {/* Community Insights — internal tool (moved out of the player app). */}
      <AdminSection emoji="📊" title="Community Insights">
        <p className="text-sm text-[var(--color-muted)]">
          Internal — what the {participants.length} Familia are predicting. Use for WhatsApp updates,
          leaderboard announcements, and community storytelling.
        </p>
        <div className="mt-4">
          <InsightsBoard participants={participants} />
        </div>
      </AdminSection>

      {/* WhatsApp generator */}
      <AdminSection emoji="📲" title="WhatsApp update generator">
        <p className="text-sm text-[var(--color-muted)]">
          One tap turns the live data into shareable community posts.
        </p>
        <div className="mt-4">
          <GenerateUpdatesButton />
        </div>
        {content.length > 0 && (
          <ul className="mt-5 space-y-3">
            {content.slice(0, 12).map((c) => (
              <li key={c.id} className="rounded-2xl border border-[var(--color-line)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{c.title}</p>
                  <CopyButton text={`${c.title}\n${c.body}`} />
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {/* Participants */}
      <AdminSection emoji="👥" title={`Participants (${participants.length})`}>
        {participants.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No participants yet.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Champion</th>
                  <th className="px-4 py-2">Via</th>
                  <th className="px-4 py-2 text-right">Brought</th>
                  <th className="px-4 py-2 text-right">Pts</th>
                  <th className="px-4 py-2">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {ranked.map((p, i) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className="block text-xs text-[var(--color-muted)]">{p.email}</span>
                    </td>
                    <td className="px-4 py-2">
                      {teamFlag(p.predictions.champion)} {teamName(p.predictions.champion)}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-muted)]">{p.referredBy ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {signupsByRef.get(p.slug) ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right font-black tabular-nums">
                      {scores[p.id]?.total ?? 0}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <a
                        href={`/copa/${p.slug}`}
                        className="text-[var(--color-pitch)] underline underline-offset-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        share
                      </a>
                      <span className="mx-1 text-[var(--color-line)]">·</span>
                      <a
                        href={`/r/${p.resumeToken}`}
                        className="text-[var(--color-pitch)] underline underline-offset-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        Lock time: {new Date(settings.lockTime).toUTCString()} · Stage: {settings.tournamentStage}
      </p>
    </main>
  );
}

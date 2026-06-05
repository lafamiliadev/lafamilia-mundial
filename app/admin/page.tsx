import { redirect } from "next/navigation";
import {
  AwardsAdmin,
  CopyButton,
  GenerateUpdatesButton,
  RecalcButton,
  ResultsForm,
  SyncGroupsButton,
} from "@/components/admin";
import { Button, SectionTitle } from "@/components/ui";
import { InsightsBoard } from "@/components/InsightsBoard";
import { adminLogout } from "@/app/actions/admin";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getProvider } from "@/lib/football";
import { getAwards } from "@/lib/services";
import { teamFlag, teamName } from "@/lib/teams";
import type { ProviderStatus } from "@/lib/football";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard · La Copa de LaFamilia 2026" };

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const repo = await db();
  const [participants, scores, settings, results, content, awards] = await Promise.all([
    repo.listParticipants(),
    repo.getScores(),
    repo.getSettings(),
    repo.getResults(),
    repo.listContent(),
    getAwards(),
  ]);

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

      {/* Referral leaderboard */}
      {topReferrers.length > 0 && (
        <section className="card mt-6 p-5">
          <SectionTitle emoji="🔗">Top referrers</SectionTitle>
          <ul className="mt-3 space-y-2">
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
        </section>
      )}

      {/* API status + actions */}
      <section className="card mt-6 p-5">
        <SectionTitle emoji="🛰️">API status</SectionTitle>
        <div className="mt-3 flex items-center gap-3">
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
      </section>

      {/* Tournament setup — group draw */}
      <section className="card mt-6 p-5">
        <SectionTitle emoji="🌐">Tournament setup</SectionTitle>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
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
      </section>

      {/* Results editor */}
      <section className="card mt-6 p-5">
        <SectionTitle emoji="🎯">Tournament results</SectionTitle>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Auto-pulled by the scoring cron; edit here to override. Saving recomputes every score.
        </p>
        <div className="mt-4">
          <ResultsForm initial={results} />
        </div>
      </section>

      {/* La Familia Honors */}
      <section className="card mt-6 p-5">
        <SectionTitle emoji="🏆">La Familia Honors</SectionTitle>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Preview the awards, then reveal them on /awards for the finale.
        </p>
        <div className="mt-4">
          <AwardsAdmin awards={awards} revealed={settings.awardsRevealed ?? false} />
        </div>
      </section>

      {/* Community Insights — internal tool (moved out of the player app). */}
      <section className="card mt-6 p-5">
        <SectionTitle emoji="📊">Community Insights</SectionTitle>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Internal — what the {participants.length} Familia are predicting. Use for WhatsApp updates,
          leaderboard announcements, and community storytelling.
        </p>
        <div className="mt-4">
          <InsightsBoard participants={participants} />
        </div>
      </section>

      {/* WhatsApp generator */}
      <section className="card mt-6 p-5">
        <SectionTitle emoji="📲">WhatsApp update generator</SectionTitle>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
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
      </section>

      {/* Participants */}
      <section className="card mt-6 overflow-hidden">
        <div className="p-5 pb-3">
          <SectionTitle emoji="👥">Participants</SectionTitle>
        </div>
        {participants.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[var(--color-muted)]">No participants yet.</p>
        ) : (
          <div className="overflow-x-auto">
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
      </section>

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        Lock time: {new Date(settings.lockTime).toUTCString()} · Stage: {settings.tournamentStage}
      </p>
    </main>
  );
}

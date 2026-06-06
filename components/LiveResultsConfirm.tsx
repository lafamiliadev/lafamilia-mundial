"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui";
import { saveMatchWinnersAction } from "@/app/actions/admin";
import { teamFlag, teamName } from "@/lib/teams";
import type { MatchImpact } from "@/lib/live";

// Foolproof results entry for a non-soccer admin. Instead of "enter the winner",
// it asks "who advanced?" with two big team buttons, shows exactly how many
// points each choice awards BEFORE saving, links to a place to check the result,
// and clearly marks what's already done. You can't pick a team that isn't in the
// match, and changing a finished result asks for an explicit re-confirm.

const ROUND_LABEL: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinal",
  sf: "Semifinal",
  final: "Final",
};

function sourceUrl(home: string, away: string): string {
  const q = `${teamName(home)} vs ${teamName(away)} 2026 World Cup result who won`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function pointsLabel(points: number, players: number, conviction: number): string {
  if (players === 0) return "no one picked them";
  const base = `${players} ${players === 1 ? "person" : "people"} · +${points} pts`;
  return conviction > 0 ? `${base} (${conviction} ⚡ doubled)` : base;
}

function MatchCard({ m }: { m: MatchImpact }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { match } = m;
  const scored = m.scoredWinner;

  function confirm(team: string) {
    setMsg(null);
    start(async () => {
      const res = await saveMatchWinnersAction({ [match.matchId]: team });
      setMsg(res.message);
      setConfirming(null);
      if (res.ok) setTimeout(() => setMsg(null), 4000);
    });
  }

  const homeAdvanced = `${teamFlag(match.homeCode)} ${teamName(match.homeCode)} advanced`;
  const awayAdvanced = `${teamFlag(match.awayCode)} ${teamName(match.awayCode)} advanced`;

  // Already scored — calm confirmation + a guarded "change" path.
  if (scored && confirming === null) {
    const winnerSide = scored === match.homeCode ? m.home : m.away;
    return (
      <li className="rounded-2xl border border-[var(--color-pitch)]/30 bg-[var(--color-pitch)]/[0.04] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-pitch)]">
              ✓ Scored
            </p>
            <p className="mt-1 font-bold">
              {teamFlag(scored)} {teamName(scored)} advanced
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              {teamName(match.homeCode)} vs {teamName(match.awayCode)} ·{" "}
              {winnerSide.players > 0
                ? `gave +${winnerSide.points} pts to ${winnerSide.players} ${winnerSide.players === 1 ? "person" : "people"}`
                : "no one had picked them"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirming("change")}
            className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)] hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
          >
            Change
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold text-[var(--color-pitch)]">{msg}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-[var(--color-line)] p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          {ROUND_LABEL[match.round] ?? match.round} · who advanced?
        </p>
        <a
          href={sourceUrl(match.homeCode, match.awayCode)}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-[var(--color-pitch)] underline underline-offset-2"
        >
          Check the result →
        </a>
      </div>
      <p className="mb-3 font-bold">
        {teamFlag(match.homeCode)} {teamName(match.homeCode)}{" "}
        <span className="text-[var(--color-muted)]">vs</span> {teamFlag(match.awayCode)}{" "}
        {teamName(match.awayCode)}
      </p>

      {scored && confirming === "change" && (
        <p className="mb-3 rounded-xl bg-[var(--color-coral)]/10 px-3 py-2 text-sm font-semibold text-[var(--color-coral)]">
          ⚠️ Already scored as {teamName(scored)}. Picking again re-scores everyone.
        </p>
      )}

      {m.totalPickers === 0 && (
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          No one picked this match — confirming won&apos;t change the leaderboard.
        </p>
      )}

      {confirming && confirming !== "change" ? (
        // Preview-before-save step.
        <div className="rounded-xl bg-black/[0.03] p-3">
          <p className="text-sm">
            Confirm: <strong>{confirming === match.homeCode ? homeAdvanced : awayAdvanced}</strong>
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            This awards{" "}
            <strong className="text-[var(--color-ink)]">
              +{(confirming === match.homeCode ? m.home : m.away).points} points
            </strong>{" "}
            to {(confirming === match.homeCode ? m.home : m.away).players}{" "}
            {(confirming === match.homeCode ? m.home : m.away).players === 1 ? "person" : "people"}
            . The leaderboard updates right away.
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => confirm(confirming)} disabled={pending} className="flex-1">
              {pending ? "Saving…" : "Yes, confirm"}
            </Button>
            <Button
              onClick={() => setConfirming(null)}
              disabled={pending}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[match.homeCode, match.awayCode].map((code) => {
            const side = code === match.homeCode ? m.home : m.away;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setConfirming(code)}
                className="flex items-center justify-between gap-2 rounded-xl border-2 border-[var(--color-line)] px-4 py-3 text-left transition hover:border-[var(--color-pitch)]"
              >
                <span className="font-bold">
                  {teamFlag(code)} {teamName(code)} advanced
                </span>
                <span className="shrink-0 text-xs text-[var(--color-muted)]">
                  {pointsLabel(side.points, side.players, side.conviction)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {msg && <p className="mt-2 text-sm font-semibold text-[var(--color-pitch)]">{msg}</p>}
    </li>
  );
}

export function LiveResultsConfirm({ impacts }: { impacts: MatchImpact[] }) {
  if (impacts.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No matchups set yet. Add the matchups above first, then results show up here to confirm.
      </p>
    );
  }
  const pending = impacts.filter((m) => !m.scoredWinner);
  const done = impacts.filter((m) => m.scoredWinner);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Needs your confirmation ({pending.length})
        </p>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            All caught up — every matchup here is scored. 🎉
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {pending.map((m) => (
              <MatchCard key={m.match.matchId} m={m} />
            ))}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Already scored ({done.length})
          </p>
          <ul className="mt-2 space-y-3">
            {done.map((m) => (
              <MatchCard key={m.match.matchId} m={m} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, cn } from "./ui";
import { saveLivePicks } from "@/app/actions/live";
import { teamFlag, teamName } from "@/lib/teams";
import type { KnockoutRound, LiveMatch, LivePick } from "@/lib/types";

/** One-tap "who wins this match?" picks for a knockout round, with a single
 * ⚡ Double Down that doubles the member's most confident match. */
export function LivePicksWizard({
  token,
  round,
  roundLabel,
  plain,
  locksLabel,
  pointsEach,
  matches,
  initialPicks,
}: {
  token: string;
  round: KnockoutRound;
  roundLabel: string;
  plain: string;
  locksLabel: string;
  pointsEach: number;
  matches: LiveMatch[];
  initialPicks: LivePick[];
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialPicks.map((p) => [p.matchId, p.team])),
  );
  const [hc, setHc] = useState<string | null>(
    () => initialPicks.find((p) => p.highConviction)?.matchId ?? null,
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialPicks.length > 0);

  const pickedCount = matches.filter((m) => picks[m.matchId]).length;

  function choose(matchId: string, team: string) {
    setSaved(false);
    setError(null);
    setPicks((p) => ({ ...p, [matchId]: team }));
  }
  function toggleHc(matchId: string) {
    setSaved(false);
    setHc((cur) => (cur === matchId ? null : matchId));
  }

  function save() {
    setError(null);
    const payload = matches
      .filter((m) => picks[m.matchId])
      .map((m) => ({
        matchId: m.matchId,
        team: picks[m.matchId],
        highConviction: hc === m.matchId,
      }));
    start(async () => {
      const res = await saveLivePicks({ token, round, picks: payload });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const hcTeam = hc ? picks[hc] : null;

  return (
    <div className="pb-28">
      <div className="mb-4 rounded-2xl bg-[var(--color-navy)] px-4 py-4 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
          ⚡ {roundLabel} · Live Picks
        </p>
        <p className="mt-1 text-sm text-white/85">
          Tap who you think wins each of {plain}. {pointsEach}{" "}
          {pointsEach === 1 ? "point" : "points"} per correct pick — locks {locksLabel}.
        </p>
        <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          ⚡ One Double Down doubles your most confident pick
        </p>
      </div>

      <div className="space-y-3">
        {matches.map((m, i) => {
          const pick = picks[m.matchId];
          const isHc = hc === m.matchId;
          return (
            <div key={m.matchId} className="card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-muted)]">Match {i + 1}</span>
                {isHc && (
                  <span className="rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-black text-[#3a2b00]">
                    ⚡ 2×
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[m.homeCode, m.awayCode].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => choose(m.matchId, code)}
                    aria-pressed={pick === code}
                    className={cn(
                      "pick card flex flex-col items-center justify-center gap-1 px-2 py-4 text-center",
                      pick === code && "pick-selected",
                    )}
                  >
                    <span className="text-3xl leading-none">{teamFlag(code)}</span>
                    <span className="text-sm font-bold leading-tight">{teamName(code)}</span>
                  </button>
                ))}
              </div>
              {pick && (
                <button
                  type="button"
                  onClick={() => toggleHc(m.matchId)}
                  className={cn(
                    "mt-2 w-full rounded-xl px-3 py-2 text-xs font-bold transition",
                    isHc
                      ? "bg-[var(--color-gold)] text-[#3a2b00]"
                      : "bg-black/[0.04] text-[var(--color-muted)] hover:text-[var(--color-ink)]",
                  )}
                >
                  {isHc ? "⚡ Double Down — on this pick" : "⚡ Double Down on this one"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg)]/95 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[var(--color-muted)]">
            <span>
              {pickedCount} of {matches.length} picked
              {hcTeam ? ` · ⚡ ${teamName(hcTeam)}` : ""}
            </span>
            {saved && !pending && <span className="text-[var(--color-pitch)]">✓ Saved</span>}
          </div>
          {error && <p className="mb-1.5 text-xs font-semibold text-[var(--color-coral)]">{error}</p>}
          <Button onClick={save} disabled={pending || pickedCount === 0} className="w-full">
            {pending ? "Saving…" : saved ? "✓ Picks saved — edit anytime" : "Save my Live Picks"}
          </Button>
        </div>
      </div>
    </div>
  );
}

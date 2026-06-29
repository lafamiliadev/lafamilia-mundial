"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "./ui";
import { Countdown } from "./Countdown";
import { saveLivePicks } from "@/app/actions/live";
import { teamFlag, teamName } from "@/lib/teams";
import type { KnockoutRound } from "@/lib/types";

export type LiveGame = {
  matchId: string;
  homeCode: string;
  awayCode: string;
  /** Server-computed: the game has kicked off and can no longer be edited. */
  locked: boolean;
  /** Human kickoff time (ET), or null if unknown. */
  kickoffLabel: string | null;
  /** The member's saved pick for this game, if any. */
  savedTeam: string | null;
  savedHc: boolean;
};

/** What a single open card shows below its flags. */
type CardStatus = "idle" | "saving" | "saved" | "error";

/**
 * Pick who advances in each knockout matchup — PER GAME, and AUTO-SAVED.
 *
 * Tapping a team commits that game immediately; the card itself flips to a loud
 * "✓ Saved" state so the member never wonders whether it counted. Games stay
 * editable until their own kickoff, then show the pick read-only ("🔒 Locked").
 * There's no Save button — the sticky footer is a calm progress line, not an
 * action the member has to remember to reach.
 *
 * Saves are serialized (one request in flight at a time, re-run if more changes
 * land while saving) and each flush submits the full open-pick snapshot, so
 * rapid taps can't race and clobber an earlier game. The single ⚡ Double Down
 * is one-per-round: moving it submits both the old and new game together, since
 * the server rejects a save that would leave two Double Downs standing.
 */
export function LivePicksWizard({
  token,
  round,
  roundLabel,
  plain,
  pointsEach,
  games,
  nextUp,
}: {
  token: string;
  round: KnockoutRound;
  roundLabel: string;
  plain: string;
  pointsEach: number;
  games: LiveGame[];
  /** The soonest still-open match — powers the header countdown. null if none. */
  nextUp: { kickoffIso: string | null; homeCode: string; awayCode: string } | null;
}) {
  const router = useRouter();

  // Current selection (optimistic) per game, and the one ⚡ Double Down game.
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    Object.fromEntries(games.filter((g) => g.savedTeam).map((g) => [g.matchId, g.savedTeam as string])),
  );
  const [hc, setHc] = useState<string | null>(() => games.find((g) => g.savedHc)?.matchId ?? null);
  // What the server has actually confirmed, per open game — drives "✓ Saved".
  const [saved, setSaved] = useState<Record<string, { team: string; hc: boolean }>>(() =>
    Object.fromEntries(
      games
        .filter((g) => !g.locked && g.savedTeam)
        .map((g) => [g.matchId, { team: g.savedTeam as string, hc: g.savedHc }]),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  // Mirrors so the serialized async flush always reads the latest selection
  // without waiting for a re-render.
  const picksRef = useRef(picks);
  const hcRef = useRef(hc);
  const savingRef = useRef(false);
  const rerunRef = useRef(false);

  const openGames = useMemo(() => games.filter((g) => !g.locked), [games]);
  // If the ⚡ Double Down is already committed on a game that has locked, it's
  // spent for the round — no open game can take it.
  const hcFrozenMatch = useMemo(
    () => games.find((g) => g.locked && g.savedHc)?.matchId ?? null,
    [games],
  );
  const hcFrozen = hcFrozenMatch != null;

  function statusOf(g: LiveGame): CardStatus {
    if (errors[g.matchId]) return "error";
    const pick = picks[g.matchId];
    if (!pick) return "idle";
    const sv = saved[g.matchId];
    const clean = sv != null && sv.team === pick && sv.hc === (hc === g.matchId);
    return clean ? "saved" : "saving";
  }

  // Serialized save: only one request in flight; if changes land mid-save, run
  // again afterward with the freshest snapshot. Each flush sends every open game
  // that has a pick, so out-of-order responses can never drop a game.
  function persist() {
    if (savingRef.current) {
      rerunRef.current = true;
      return;
    }
    const curPicks = picksRef.current;
    const curHc = hcRef.current;
    const payload = openGames
      .filter((g) => curPicks[g.matchId])
      .map((g) => ({ matchId: g.matchId, team: curPicks[g.matchId], highConviction: curHc === g.matchId }));
    if (payload.length === 0) return;

    savingRef.current = true;
    rerunRef.current = false;
    start(async () => {
      const res = await saveLivePicks({ token, round, picks: payload });
      savingRef.current = false;
      if (res.ok) {
        setSaved(Object.fromEntries(payload.map((p) => [p.matchId, { team: p.team, hc: p.highConviction }])));
        setErrors({});
        router.refresh();
      } else {
        setErrors(Object.fromEntries(payload.map((p) => [p.matchId, res.error])));
      }
      if (rerunRef.current) persist();
    });
  }

  function choose(matchId: string, team: string) {
    if (picks[matchId] === team) return;
    const next = { ...picksRef.current, [matchId]: team };
    picksRef.current = next;
    setPicks(next);
    setErrors((e) => {
      if (!e[matchId]) return e;
      const rest = { ...e };
      delete rest[matchId];
      return rest;
    });
    persist();
  }

  function toggleHc(matchId: string) {
    if (hcFrozen) return;
    const next = hcRef.current === matchId ? null : matchId;
    hcRef.current = next;
    setHc(next);
    persist();
  }

  const savedCount = openGames.filter((g) => statusOf(g) === "saved").length;
  const anySaving = openGames.some((g) => statusOf(g) === "saving");
  const anyError = openGames.some((g) => statusOf(g) === "error");

  return (
    <div className={openGames.length > 0 ? "pb-24" : ""}>
      <div className="mb-4 rounded-2xl bg-[var(--color-navy)] px-4 py-4 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
          ⚡ {roundLabel} · Live Picks
        </p>
        <p className="mt-1 text-sm text-white/85">
          Pick who advances in each of {plain}. {pointsEach}{" "}
          {pointsEach === 1 ? "point" : "points"} per correct pick — each game locks at its own kickoff.
        </p>
        {nextUp?.kickoffIso && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Next kickoff — {teamFlag(nextUp.homeCode)} {teamName(nextUp.homeCode)}{" "}
              <span className="text-white/50">vs</span> {teamFlag(nextUp.awayCode)} {teamName(nextUp.awayCode)}
            </p>
            <Countdown lockTime={nextUp.kickoffIso} doneLabel="⏱️ Kicking off — this match is locking…" />
          </div>
        )}
        {openGames.length > 0 ? (
          <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            ✓ Every tap saves automatically — change your picks anytime until kickoff
          </p>
        ) : (
          <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            🔒 Every game this round has kicked off — picks are locked
          </p>
        )}
      </div>

      <div className="space-y-3">
        {games.map((g, i) => {
          const pick = picks[g.matchId];
          const isHc = hc === g.matchId;
          const status = g.locked ? null : statusOf(g);
          return (
            <div key={g.matchId} className={cn("card p-3", g.locked && "opacity-90")}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-muted)]">Match {i + 1}</span>
                <span className="flex items-center gap-1.5">
                  {isHc && (
                    <span className="rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-black text-[#3a2b00]">
                      ⚡ 2×
                    </span>
                  )}
                  {g.locked ? (
                    <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted)]">
                      🔒 Locked{g.kickoffLabel ? ` · ${g.kickoffLabel}` : ""}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--color-pitch)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-pitch)]">
                      Open{g.kickoffLabel ? ` · locks ${g.kickoffLabel}` : ""}
                    </span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[g.homeCode, g.awayCode].map((code) => {
                  const selected = pick === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={g.locked}
                      onClick={() => choose(g.matchId, code)}
                      aria-pressed={selected}
                      className={cn(
                        "pick card flex flex-col items-center justify-center gap-1 px-2 py-4 text-center",
                        selected && "pick-selected",
                        g.locked && "cursor-default opacity-60",
                        g.locked && !selected && "opacity-35",
                      )}
                    >
                      <span className="text-3xl leading-none">{teamFlag(code)}</span>
                      <span className="text-sm font-bold leading-tight">{teamName(code)}</span>
                    </button>
                  );
                })}
              </div>

              {g.locked ? (
                <p className="mt-2 text-center text-xs font-semibold text-[var(--color-muted)]">
                  {g.savedTeam
                    ? `Your pick: ${teamName(g.savedTeam)}${g.savedHc ? " · ⚡ 2×" : ""} — locked`
                    : "No pick — this game has started"}
                </p>
              ) : (
                <>
                  {pick && (
                    <button
                      type="button"
                      onClick={() => toggleHc(g.matchId)}
                      disabled={hcFrozen && !isHc}
                      className={cn(
                        "mt-2 w-full rounded-xl px-3 py-2 text-xs font-bold transition",
                        isHc
                          ? "bg-[var(--color-gold)] text-[#3a2b00]"
                          : "bg-black/[0.04] text-[var(--color-muted)] hover:text-[var(--color-ink)]",
                        hcFrozen && !isHc && "cursor-not-allowed opacity-40 hover:text-[var(--color-muted)]",
                      )}
                    >
                      {isHc
                        ? "⚡ Double Down — on this pick"
                        : hcFrozen
                          ? "⚡ Double Down used on an earlier game"
                          : "⚡ Double Down on this one"}
                    </button>
                  )}

                  {/* Per-card status — the confirmation that makes each pick feel complete. */}
                  {status === "saved" && (
                    <p className="mt-2 text-center text-xs font-semibold text-[var(--color-pitch)]">
                      ✓ Saved · change anytime until kickoff
                    </p>
                  )}
                  {status === "saving" && (
                    <p className="mt-2 text-center text-xs font-semibold text-[var(--color-muted)]">
                      Saving…
                    </p>
                  )}
                  {status === "error" && (
                    <p className="mt-2 flex items-center justify-center gap-2 text-center text-xs font-semibold text-[var(--color-coral)]">
                      <span>⚠️ {errors[g.matchId]}</span>
                      <button
                        type="button"
                        onClick={() => persist()}
                        className="rounded-full bg-[var(--color-coral)]/10 px-2 py-0.5 font-bold underline-offset-2 hover:underline"
                      >
                        Retry
                      </button>
                    </p>
                  )}
                  {status === "idle" && (
                    <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
                      Tap a team to lock in your pick
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {openGames.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg)]/95 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-4 py-3 text-center text-sm font-semibold">
            {anyError ? (
              <span className="text-[var(--color-coral)]">
                ⚠️ A pick didn&apos;t save — tap Retry on that card
              </span>
            ) : anySaving ? (
              <span className="text-[var(--color-muted)]">Saving your picks…</span>
            ) : savedCount === openGames.length ? (
              <span className="text-[var(--color-pitch)]">
                ✓ All {openGames.length} {openGames.length === 1 ? "pick" : "picks"} saved
              </span>
            ) : (
              <span className="text-[var(--color-muted)]">
                {savedCount} of {openGames.length} {openGames.length === 1 ? "pick" : "picks"} saved
                {savedCount === 0 ? " — tap a team to start" : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

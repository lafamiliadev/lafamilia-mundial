"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, cn } from "./ui";
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

/**
 * Pick who advances in each knockout matchup — PER GAME, like score
 * predictions. Open games are editable until their kickoff; locked games show
 * the saved pick read-only. Save one, several, or all open games at once; a
 * save never touches locked games.
 */
export function LivePicksWizard({
  token,
  round,
  roundLabel,
  plain,
  pointsEach,
  games,
}: {
  token: string;
  round: KnockoutRound;
  roundLabel: string;
  plain: string;
  pointsEach: number;
  games: LiveGame[];
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    Object.fromEntries(games.filter((g) => g.savedTeam).map((g) => [g.matchId, g.savedTeam as string])),
  );
  const [hc, setHc] = useState<string | null>(
    () => games.find((g) => g.savedHc)?.matchId ?? null,
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const openGames = useMemo(() => games.filter((g) => !g.locked), [games]);
  // If the ⚡ Double Down is already committed on a game that has locked, it's
  // spent for the round — no open game can take it.
  const hcFrozenMatch = useMemo(
    () => games.find((g) => g.locked && g.savedHc)?.matchId ?? null,
    [games],
  );
  const hcFrozen = hcFrozenMatch != null;
  const pickedOpen = openGames.filter((g) => picks[g.matchId]).length;

  function choose(matchId: string, team: string) {
    setSaved(false);
    setError(null);
    setPicks((p) => ({ ...p, [matchId]: team }));
  }
  function toggleHc(matchId: string) {
    if (hcFrozen) return;
    setSaved(false);
    setHc((cur) => (cur === matchId ? null : matchId));
  }

  function save() {
    setError(null);
    const payload = openGames
      .filter((g) => picks[g.matchId])
      .map((g) => ({ matchId: g.matchId, team: picks[g.matchId], highConviction: hc === g.matchId }));
    if (payload.length === 0) return;
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

  return (
    <div className={openGames.length > 0 ? "pb-28" : ""}>
      <div className="mb-4 rounded-2xl bg-[var(--color-navy)] px-4 py-4 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
          ⚡ {roundLabel} · Live Picks
        </p>
        <p className="mt-1 text-sm text-white/85">
          Pick who advances in each of {plain}. {pointsEach}{" "}
          {pointsEach === 1 ? "point" : "points"} per correct pick — each game locks at its own kickoff.
        </p>
        {openGames.length > 0 ? (
          <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            Save one, several, or all open games — locked games can&apos;t change
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
                pick && (
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
                )
              )}
            </div>
          );
        })}
      </div>

      {openGames.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg)]/95 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[var(--color-muted)]">
              <span>
                {pickedOpen} of {openGames.length} open {openGames.length === 1 ? "game" : "games"} picked
              </span>
              {saved && !pending && <span className="text-[var(--color-pitch)]">✓ Saved</span>}
            </div>
            {error && <p className="mb-1.5 text-xs font-semibold text-[var(--color-coral)]">{error}</p>}
            <Button onClick={save} disabled={pending || pickedOpen === 0} className="w-full">
              {pending
                ? "Saving…"
                : saved
                  ? "✓ Saved — keep editing open games"
                  : pickedOpen <= 1
                    ? "Save my pick"
                    : `Save my ${pickedOpen} picks`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

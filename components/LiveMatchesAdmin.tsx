"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui";
import { saveLiveMatchesAction } from "@/app/actions/admin";
import { ROUND_MATCH_COUNT, matchId } from "@/lib/live";
import { TEAMS } from "@/lib/teams";
import { KNOCKOUT_ROUNDS, type KnockoutRound, type LiveMatch } from "@/lib/types";

// Step 1 of the Live Picks admin: set each round's matchups (who plays whom).
// Results are confirmed separately in the foolproof "confirm who advanced" UI.

const ROUND_LABEL: Record<KnockoutRound, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinals",
  sf: "Semifinals",
  final: "Final",
};

const TEAM_OPTIONS = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));

const selectCls =
  "w-full rounded-xl border border-[var(--color-line)] bg-white px-2 py-2 text-sm outline-none focus:border-[var(--color-pitch)]";

function TeamSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {TEAM_OPTIONS.map((t) => (
        <option key={t.code} value={t.code}>
          {t.flag} {t.name}
        </option>
      ))}
    </select>
  );
}

/** ISO → the browser-local "YYYY-MM-DDTHH:mm" a datetime-local input wants. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Per-round matchup editor — remounted (via key) when the round changes so
 * state always reflects the saved matchups for that round. */
function RoundEditor({
  round,
  initialMatches,
}: {
  round: KnockoutRound;
  initialMatches: LiveMatch[];
}) {
  const count = ROUND_MATCH_COUNT[round];
  const byId = new Map(initialMatches.filter((m) => m.round === round).map((m) => [m.matchId, m]));

  const [rows, setRows] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const m = byId.get(matchId(round, i));
      return {
        home: m?.homeCode ?? "",
        away: m?.awayCode ?? "",
        // Browser-local conversion — differs between the server render and the
        // client, so the input carries suppressHydrationWarning below.
        kickoff: isoToLocalInput(m?.kickoffIso ?? null),
      };
    }),
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function setRow(i: number, field: "home" | "away" | "kickoff", v: string) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [field]: v } : r)));
  }

  function saveMatchups() {
    const matches: LiveMatch[] = rows.map((r, i) => ({
      matchId: matchId(round, i),
      round,
      homeCode: r.home,
      awayCode: r.away,
      // Without a kickoff a match counts as LOCKED (never pickable), so the
      // admin's local-time entry is converted to ISO here. Left blank, the
      // save action keeps whatever kickoff the matchup already had.
      kickoffIso: r.kickoff ? new Date(r.kickoff).toISOString() : null,
    }));
    start(async () => {
      const res = await saveLiveMatchesAction(round, matches);
      setMsg(res.message);
      setTimeout(() => setMsg(null), 2500);
    });
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
        Matchups — {count} {count === 1 ? "match" : "matches"}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Kickoff is in YOUR local time. Picks for a game stay open until its kickoff — a matchup
        without one can&apos;t be picked at all.
      </p>
      <div className="mt-2 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-[var(--color-muted)]">
              {i + 1}
            </span>
            <TeamSelect value={r.home} onChange={(v) => setRow(i, "home", v)} placeholder="Home —" />
            <span className="shrink-0 text-xs font-bold text-[var(--color-muted)]">vs</span>
            <TeamSelect value={r.away} onChange={(v) => setRow(i, "away", v)} placeholder="Away —" />
            <input
              type="datetime-local"
              value={r.kickoff}
              onChange={(e) => setRow(i, "kickoff", e.target.value)}
              className={`${selectCls} max-w-[180px] shrink-0`}
              aria-label={`Match ${i + 1} kickoff (local time)`}
              suppressHydrationWarning
            />
          </div>
        ))}
      </div>
      <Button onClick={saveMatchups} disabled={pending} variant="outline" className="mt-3 w-full">
        {pending ? "Saving…" : `Save ${ROUND_LABEL[round]} matchups`}
      </Button>
      {msg && <p className="mt-2 text-center text-sm font-semibold text-[var(--color-pitch)]">{msg}</p>}
    </div>
  );
}

export function LiveMatchesAdmin({ initialMatches }: { initialMatches: LiveMatch[] }) {
  const [round, setRound] = useState<KnockoutRound>("r32");
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {KNOCKOUT_ROUNDS.map((r) => {
          const set = initialMatches.filter((m) => m.round === r).length;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRound(r)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                round === r
                  ? "bg-[var(--color-pitch)] text-white"
                  : "bg-black/[0.04] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {ROUND_LABEL[r]}
              {set > 0 ? ` · ${set}` : ""}
            </button>
          );
        })}
      </div>
      <RoundEditor key={round} round={round} initialMatches={initialMatches} />
    </div>
  );
}

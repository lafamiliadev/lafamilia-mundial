"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  linkScoreFixturesAction,
  resetScoreAction,
  scoreManuallyAction,
  useApiScoreAction,
} from "@/app/actions/admin";
import type { ScoreMatchAdminRow, ScoreMatchState } from "@/lib/services";

const BADGE: Record<ScoreMatchState, { label: string; cls: string }> = {
  unlinked: { label: "Not linked", cls: "bg-black/[0.06] text-[var(--color-muted)]" },
  waiting: { label: "Waiting for kickoff", cls: "bg-black/[0.06] text-[var(--color-muted)]" },
  live: { label: "In progress", cls: "bg-amber-100 text-amber-800" },
  "final-unscored": { label: "Final — confirm to score", cls: "bg-emerald-100 text-emerald-800" },
  scored: { label: "Scored", cls: "bg-[var(--color-pitch)]/15 text-[var(--color-pitch)]" },
  review: { label: "Needs review", cls: "bg-[var(--color-coral)]/15 text-[var(--color-coral)]" },
};

/** One match row: status, API score, and the available actions. */
function Row({ row }: { row: ScoreMatchAdminRow }) {
  const { match } = row;
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.message);
    });

  const badge = BADGE[row.state];
  const storedScore =
    match.finalScoreA != null && match.finalScoreB != null
      ? `${match.teamA} ${match.finalScoreA}–${match.finalScoreB} ${match.teamB}`
      : null;

  return (
    <li className="rounded-2xl border border-[var(--color-line)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">
            {match.teamA} <span className="text-[var(--color-muted)]">vs</span> {match.teamB}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {match.displayTimeEt} · up to {row.maxPoints} pts ·{" "}
            {row.predictionCount} pick{row.predictionCount === 1 ? "" : "s"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Provenance + stored score, once scored */}
      {row.state === "scored" && storedScore && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{storedScore}</span>{" "}
          <span className="text-[var(--color-muted)]">
            · {match.scoredBy === "api" ? "from API ✓" : "entered by hand ✓"}
          </span>
        </p>
      )}

      {/* Live API readout for unscored rows */}
      {row.state !== "scored" && row.apiScoreLabel && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          API final: <span className="font-semibold text-[var(--color-ink)]">{row.apiScoreLabel}</span>
        </p>
      )}
      {row.note && <p className="mt-1 text-xs text-[var(--color-muted)]">{row.note}</p>}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        {row.state === "final-unscored" && (
          <Button variant="primary" disabled={pending} onClick={() => run(() => useApiScoreAction(match.matchId))}>
            {pending ? "Scoring…" : "Use API score"}
          </Button>
        )}

        {row.state === "scored" ? (
          <Button variant="outline" disabled={pending} onClick={() => run(() => resetScoreAction(match.matchId))}>
            {pending ? "Resetting…" : "Correct & re-score"}
          </Button>
        ) : (
          <div className="flex items-end gap-2">
            <label className="text-xs text-[var(--color-muted)]">
              {match.teamA}
              <input
                inputMode="numeric"
                value={a}
                onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 block w-16 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-pitch)]"
                placeholder="0"
              />
            </label>
            <label className="text-xs text-[var(--color-muted)]">
              {match.teamB}
              <input
                inputMode="numeric"
                value={b}
                onChange={(e) => setB(e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 block w-16 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-pitch)]"
                placeholder="0"
              />
            </label>
            <Button
              variant="outline"
              disabled={pending || a === "" || b === ""}
              onClick={() => run(() => scoreManuallyAction(match.matchId, Number(a), Number(b)))}
            >
              {pending ? "Saving…" : "Score by hand"}
            </Button>
          </div>
        )}
      </div>

      {msg && <p className="mt-2 text-sm text-[var(--color-muted)]">{msg}</p>}
    </li>
  );
}

/** Admin section: link score-prediction matches to the API, see live status, and
 * confirm/award scores. Phase 1 is shadow-first — nothing auto-awards. */
export function ScoreMatchesAdmin({ rows }: { rows: ScoreMatchAdminRow[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg(null);
              const r = await linkScoreFixturesAction();
              setMsg(r.message);
            })
          }
        >
          {pending ? "Linking…" : "🔗 Link API fixtures"}
        </Button>
        <span className="text-xs text-[var(--color-muted)]">
          Matches the seeded games to API fixtures by team + date. Safe to re-run.
        </span>
      </div>
      {msg && <p className="mt-2 text-sm text-[var(--color-muted)]">{msg}</p>}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">No bonus score matches seeded.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <Row key={r.match.matchId} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

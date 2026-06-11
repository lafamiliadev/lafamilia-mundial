"use client";

import { useTransition, useState } from "react";
import { submitScorePrediction } from "@/app/actions/score-prediction";
import { Button } from "@/components/ui";
import type { ScoreMatch, ScorePrediction } from "@/lib/types";

function ScoreInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-bold text-[var(--color-ink)]">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={30}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-16 w-20 rounded-2xl border-2 border-[var(--color-line)] bg-white text-center text-3xl font-black text-[var(--color-ink)] focus:border-[var(--color-pitch)] focus:outline-none disabled:opacity-50"
        placeholder="—"
        aria-label={`${label} score`}
      />
    </div>
  );
}

export function ScoreForm({
  match,
  existing,
  isLocked,
}: {
  match: ScoreMatch;
  existing: ScorePrediction | null;
  isLocked: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [scoreA, setScoreA] = useState(existing ? String(existing.scoreA) : "");
  const [scoreB, setScoreB] = useState(existing ? String(existing.scoreB) : "");
  const [saved, setSaved] = useState<ScorePrediction | null>(existing);
  const [error, setError] = useState<string | null>(null);

  if (isLocked) {
    return (
      <div className="rounded-2xl bg-[var(--color-cream)] px-5 py-5 text-center">
        <p className="text-sm font-bold text-[var(--color-muted)]">🔒 Score picks are locked for this match.</p>
        {saved && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Your pick: {match.teamA} {saved.scoreA} – {saved.scoreB} {match.teamB}
          </p>
        )}
      </div>
    );
  }

  const hasEdited = existing
    ? scoreA !== String(existing.scoreA) || scoreB !== String(existing.scoreB)
    : scoreA !== "" || scoreB !== "";

  function validate(): string | null {
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    if (scoreA === "" || scoreB === "") return "Enter a score for both teams.";
    if (!Number.isInteger(a) || !Number.isInteger(b)) return "Scores must be whole numbers.";
    if (a < 0 || a > 30 || b < 0 || b > 30) return "Scores must be between 0 and 30.";
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    startTransition(async () => {
      const result = await submitScorePrediction({
        matchId: match.matchId,
        scoreA: parseInt(scoreA, 10),
        scoreB: parseInt(scoreB, 10),
      });
      if (result.ok) {
        setSaved(result.prediction);
      } else {
        setError(result.error);
      }
    });
  }

  const justSaved = saved && !hasEdited;

  return (
    <div className="space-y-5">
      {justSaved && (
        <div className="rounded-2xl bg-[var(--color-pitch)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-pitch)]">
          Your score pick is in: {match.teamA} {saved.scoreA} – {saved.scoreB} {match.teamB}. Locked before kickoff. Vamos.
        </div>
      )}

      <div className="flex items-center justify-center gap-6">
        <ScoreInput label={match.teamA} value={scoreA} onChange={setScoreA} disabled={isPending} />
        <span className="mt-6 text-2xl font-black text-[var(--color-muted)]">–</span>
        <ScoreInput label={match.teamB} value={scoreB} onChange={setScoreB} disabled={isPending} />
      </div>

      {error && (
        <p className="text-center text-sm font-semibold text-red-600">{error}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full"
        variant="primary"
      >
        {isPending ? "Saving…" : saved && !hasEdited ? "Pick saved ✓" : saved ? "Update my score" : "Lock my score"}
      </Button>

      <p className="text-center text-xs text-[var(--color-muted)]">
        Exact score: +3 pts · Correct winner or draw: +1 pt
      </p>
    </div>
  );
}

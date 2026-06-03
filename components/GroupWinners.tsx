"use client";

import { cn } from "./ui";
import { teamFlag, teamName } from "@/lib/teams";
import type { GroupMap } from "@/lib/types";

// One continuous screen: 12 group cards, tap the team you think finishes 1st in
// each group. Picking auto-glides the next unfilled group into view so the long
// list feels guided, not like a chore.
export function GroupWinners({
  groups,
  value,
  onChange,
}: {
  groups: GroupMap;
  value: Record<string, string> | null;
  onChange: (next: Record<string, string>) => void;
}) {
  const letters = Object.keys(groups).sort();
  const picks = value ?? {};
  const filled = letters.filter((l) => picks[l]).length;

  function pick(letter: string, code: string) {
    const next = { ...picks, [letter]: code };
    onChange(next);
    // Glide the next still-empty group into view (or nothing if we just finished).
    const idx = letters.indexOf(letter);
    const nextLetter = letters.slice(idx + 1).find((l) => !next[l]);
    if (nextLetter) {
      requestAnimationFrame(() => {
        document
          .getElementById(`group-${nextLetter}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  if (letters.length === 0) {
    return (
      <p className="card p-5 text-center text-sm text-[var(--color-muted)]">
        The group draw is being finalized — check back shortly to make your picks. ⚽
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-[60px] z-[6] -mx-1 rounded-xl bg-[var(--color-bg)]/95 px-1 py-1.5 backdrop-blur">
        <p className="text-sm font-bold text-[var(--color-ink)]">
          Group winners{" "}
          <span className={cn(filled === letters.length ? "text-[var(--color-pitch)]" : "text-[var(--color-muted)]")}>
            {filled} / {letters.length}
          </span>
        </p>
      </div>

      {letters.map((letter) => (
        <div key={letter} id={`group-${letter}`} className="card p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Group {letter}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(groups[letter] ?? []).map((code) => {
              const selected = picks[letter] === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => pick(letter, code)}
                  aria-pressed={selected}
                  className={cn(
                    "pick card flex items-center gap-2 px-3 py-2.5 text-left",
                    selected && "pick-selected",
                  )}
                >
                  <span className="text-xl leading-none">{teamFlag(code)}</span>
                  <span className="text-sm font-bold leading-tight">{teamName(code)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

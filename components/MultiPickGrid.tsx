"use client";

import { useMemo, useState } from "react";
import { cn } from "./ui";
import type { PickOption } from "./PickGrid";

// Multi-select flag grid with a hard cap (used for the Final Four). Once `max`
// are chosen the rest dim out; tap a selected one to free a slot.
export function MultiPickGrid({
  options,
  selected,
  onToggle,
  max = 4,
  searchable = true,
  searchPlaceholder = "Search teams…",
}: {
  options: PickOption[];
  selected: string[];
  onToggle: (key: string) => void;
  max?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.sublabel?.toLowerCase().includes(needle) ||
        o.key.toLowerCase().includes(needle),
    );
  }, [options, q]);

  const full = selected.length >= max;

  return (
    <div>
      {searchable && (
        <input
          type="text"
          inputMode="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="mb-3 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--color-pitch)]"
        />
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {filtered.map((o) => {
          const isSel = selected.includes(o.key);
          const disabled = full && !isSel;
          return (
            <button
              key={o.key}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(o.key)}
              aria-pressed={isSel}
              className={cn(
                "pick card relative flex flex-col items-center justify-center gap-1 px-2 py-4 text-center",
                isSel && "pick-selected",
                disabled && "opacity-40",
              )}
            >
              {isSel && (
                <span className="absolute right-2 top-2 text-sm text-[var(--color-pitch)]">✓</span>
              )}
              {o.flag && <span className="text-3xl leading-none">{o.flag}</span>}
              <span className="text-sm font-bold leading-tight">{o.label}</span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--color-muted)]">
            No matches for “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}

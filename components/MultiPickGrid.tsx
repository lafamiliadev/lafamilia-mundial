"use client";

import { useMemo, useState } from "react";
import { cn } from "./ui";
import type { PickOption } from "./PickGrid";

// Multi-select flag grid with a hard cap (used for the Final Four). Once `max`
// are chosen the rest dim out; tap a selected one to free a slot.
//
// `prioritize` surfaces a set of codes first under their own label (e.g. the
// member's just-picked group winners), with everyone else in a second section —
// so a non-fan sees the connection to the previous step without being limited
// to those teams (any team can still reach the semis).
export function MultiPickGrid({
  options,
  selected,
  onToggle,
  max = 4,
  searchable = true,
  searchPlaceholder = "Search teams…",
  prioritize,
  prioritizeLabel = "Your group winners",
  restLabel = "Everyone else",
}: {
  options: PickOption[];
  selected: string[];
  onToggle: (key: string) => void;
  max?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  prioritize?: string[];
  prioritizeLabel?: string;
  restLabel?: string;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const full = selected.length >= max;

  const filtered = useMemo(() => {
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.sublabel?.toLowerCase().includes(needle) ||
        o.key.toLowerCase().includes(needle),
    );
  }, [options, needle]);

  const renderCard = (o: PickOption) => {
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
  };

  const grid = (items: PickOption[]) => (
    <div className="grid grid-cols-2 gap-2.5">{items.map(renderCard)}</div>
  );
  const label = (text: string, className?: string) => (
    <p className={cn("mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]", className)}>
      {text}
    </p>
  );

  // Sectioned view (no active search): prioritized picks first, then everyone else.
  const prioCodes = prioritize ?? [];
  const prioItems = prioCodes
    .map((c) => options.find((o) => o.key === c))
    .filter((o): o is PickOption => Boolean(o));
  const restItems = options.filter((o) => !prioCodes.includes(o.key));

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

      {needle ? (
        filtered.length ? (
          grid(filtered)
        ) : (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">No matches for “{q}”.</p>
        )
      ) : prioItems.length ? (
        <>
          {label(prioritizeLabel)}
          {grid(prioItems)}
          {label(restLabel, "mt-6")}
          {grid(restItems)}
        </>
      ) : (
        grid(options)
      )}
    </div>
  );
}

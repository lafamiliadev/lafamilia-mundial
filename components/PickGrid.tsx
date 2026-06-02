"use client";

import { useMemo, useState } from "react";
import { cn } from "./ui";

export type PickOption = {
  key: string;
  label: string;
  sublabel?: string;
  flag?: string;
};

export function PickGrid({
  options,
  value,
  onChange,
  searchable = false,
  searchPlaceholder = "Search…",
  columns = 2,
  allowNone,
}: {
  options: PickOption[];
  value: string | null;
  onChange: (key: string | null) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  columns?: 2 | 3;
  allowNone?: { key: string; label: string };
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

      <div
        className={cn(
          "grid gap-2.5",
          columns === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange(value === allowNone.key ? null : allowNone.key)}
            className={cn(
              "pick card col-span-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--color-muted)]",
              value === allowNone.key && "pick-selected",
            )}
          >
            🤷 {allowNone.label}
          </button>
        )}

        {filtered.map((o) => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(selected ? null : o.key)}
              aria-pressed={selected}
              className={cn(
                "pick card flex flex-col items-center justify-center gap-1 px-2 py-4 text-center",
                selected && "pick-selected",
              )}
            >
              {o.flag && <span className="text-3xl leading-none">{o.flag}</span>}
              <span className="text-sm font-bold leading-tight">{o.label}</span>
              {o.sublabel && (
                <span className="text-[11px] text-[var(--color-muted)]">{o.sublabel}</span>
              )}
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

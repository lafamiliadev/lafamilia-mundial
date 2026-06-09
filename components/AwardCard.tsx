"use client";

import { useState } from "react";
import { cn } from "./ui";
import { teamFlag } from "@/lib/teams";
import type { Award, AwardCatalogEntry } from "@/lib/awards";

// One Hall-of-Honors card. Always rendered (even with no winner yet): a category
// with a winner celebrates them; one without shows an alive, anticipatory state
// plus when it unlocks. The "How it's awarded" explainer expands on tap.
export function AwardCard({ entry, winner }: { entry: AwardCatalogEntry; winner: Award | null }) {
  const [open, setOpen] = useState(false);
  const featured = !!entry.featured;
  const won = !!winner;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl transition",
        featured
          ? "text-white sm:col-span-2"
          : cn("card", won && "ring-2 ring-[var(--color-gold)]"),
      )}
      style={
        featured
          ? {
              background: won
                ? "linear-gradient(150deg,#1a5e3a 0%,#0a3d24 100%)"
                : "linear-gradient(150deg,#0a2342 0%,#123a6b 100%)",
            }
          : undefined
      }
    >
      <div className={featured ? "p-6 text-center" : "p-5"}>
        {/* Icon + status */}
        <div className={cn("flex items-start", featured ? "justify-center" : "justify-between")}>
          <span className={featured ? "text-5xl" : "text-3xl"} aria-hidden>
            {entry.emoji}
          </span>
          {!featured && (
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                won ? "bg-[var(--color-gold)] text-[#3a2b00]" : "bg-black/[0.05] text-[var(--color-muted)]",
              )}
            >
              {won ? "🏅 Awarded" : "Up for grabs"}
            </span>
          )}
        </div>

        <h3
          className={
            featured ? "mt-2 text-3xl font-black tracking-tight" : "mt-2 text-lg font-extrabold tracking-tight"
          }
        >
          {entry.name}
        </h3>
        <p className={featured ? "mt-1 text-sm text-white/80" : "mt-0.5 text-sm text-[var(--color-muted)]"}>
          {entry.blurb}
        </p>

        {/* Winner, or alive empty state */}
        <div className={cn(featured ? "mt-4" : "mt-3", featured && "text-left")}>
          {won ? (
            <div className="space-y-2">
              {winner!.winners.slice(0, featured ? 1 : 3).map((w) => (
                <div
                  key={w.slug + w.name}
                  className={cn(
                    "rounded-2xl px-4 py-2.5",
                    featured ? "bg-white/12" : "bg-[var(--color-gold-soft)]/40",
                  )}
                >
                  <p className={featured ? "text-xl font-black" : "font-bold"}>
                    {teamFlag(w.rootingCountry)} {w.name}
                  </p>
                  <p className={featured ? "text-sm text-white/80" : "text-xs text-[var(--color-muted)]"}>
                    {w.detail}
                  </p>
                </div>
              ))}
              {!featured && winner!.winners.length > 3 && (
                <p className="text-xs text-[var(--color-muted)]">
                  + {winner!.winners.length - 3} more in the Familia
                </p>
              )}
            </div>
          ) : (
            <div className={cn("rounded-2xl px-4 py-3", featured ? "bg-white/10" : "bg-black/[0.03]")}>
              <p className="text-sm font-semibold">{entry.emptyState}</p>
              <p className={cn("mt-1 text-xs", featured ? "text-white/70" : "text-[var(--color-muted)]")}>
                🔓 Unlocks: {entry.availableAfter}
              </p>
            </div>
          )}
        </div>

        {/* How it's awarded */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-bold underline-offset-4 hover:underline",
            featured ? "text-[var(--color-gold-soft)]" : "text-[var(--color-pitch)]",
          )}
        >
          {open ? "Hide" : "ⓘ How it's awarded"} {open ? "▴" : "▾"}
        </button>
        {open && (
          <p
            className={cn(
              "mt-2 text-sm leading-relaxed",
              featured ? "text-white/85" : "text-[var(--color-muted)]",
            )}
          >
            {entry.howItsAwarded}
          </p>
        )}
      </div>
    </div>
  );
}

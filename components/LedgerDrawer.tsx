"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlayerLedgerAction } from "@/app/actions/leaderboard";
import type { PlayerLedger } from "@/lib/services";

/** Detail of the custom event a leaderboard row dispatches to open the ledger. */
export type OpenLedgerDetail = { slug: string; name: string };

/** Fire from any row: opens the ledger bottom sheet for that player. */
export function openLedger(detail: OpenLedgerDetail) {
  window.dispatchEvent(new CustomEvent("open-ledger", { detail }));
}

/** Display order + plain-language headers for the grouped ledger. */
const SECTIONS: { key: string; label: string; blurb: string }[] = [
  { key: "bracket", label: "🏆 The Bracket", blurb: "group winners, Final Four & champion" },
  { key: "bonus", label: "⭐ Bonus Picks", blurb: "Golden Ball / Boot / Glove & Dark Horse" },
  { key: "live", label: "⚡ Knockout Picks", blurb: "who-advances picks, round by round" },
  { key: "score", label: "🎯 Score Predictions", blurb: "exact scores & correct winners" },
];

/**
 * One shared bottom sheet, mounted once on the leaderboard. Listens for the
 * "open-ledger" event, fetches that player's points ledger, and slides up a
 * scrollable sheet. The main board stays clean — nothing shows until tapped.
 */
export function LedgerDrawer() {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<OpenLedgerDetail | null>(null);
  const [data, setData] = useState<PlayerLedger | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenLedgerDetail>).detail;
      setMeta(detail);
      setData(null);
      setLoading(true);
      setOpen(true);
      getPlayerLedgerAction(detail.slug)
        .then((r) => setData(r))
        .finally(() => setLoading(false));
    };
    window.addEventListener("open-ledger", handler as EventListener);
    return () => window.removeEventListener("open-ledger", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  const close = () => setOpen(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 cursor-default bg-black/40" onClick={close} />
      <div className="relative max-h-[82vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight">{meta?.name}</h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Points ledger
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full px-3 py-1 text-lg font-bold text-[var(--color-muted)] hover:bg-black/[0.05]"
          >
            ✕
          </button>
        </div>

        {loading && <p className="mt-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>}

        {!loading && data && (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black tabular-nums">{data.total}</span>
              <span className="text-sm font-semibold text-[var(--color-muted)]">
                total point{data.total === 1 ? "" : "s"}
              </span>
            </div>

            {data.lines.length > 0 ? (
              <div className="mt-4 space-y-4">
                {SECTIONS.map((s) => {
                  const lines = data.lines.filter((l) => l.group === s.key);
                  if (lines.length === 0) return null;
                  const subtotal = lines.reduce((sum, l) => sum + l.points, 0);
                  return (
                    <div key={s.key} className="rounded-2xl bg-black/[0.03] px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2 py-1">
                        <div>
                          <p className="text-sm font-bold">{s.label}</p>
                          <p className="text-[11px] text-[var(--color-muted)]">{s.blurb}</p>
                        </div>
                        <span className="shrink-0 text-sm font-black tabular-nums text-[var(--color-pitch)]">
                          +{subtotal}
                        </span>
                      </div>
                      <ul className="divide-y divide-[var(--color-line)]">
                        {lines.map((l, i) => (
                          <li key={i} className="flex items-start gap-3 py-2">
                            <span className="w-9 shrink-0 text-right text-sm font-black tabular-nums text-[var(--color-pitch)]">
                              +{l.points}
                            </span>
                            <span className="text-sm leading-snug">{l.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-[var(--color-gold-soft)]/40 p-4 text-sm">
                <p className="font-semibold">No points yet — and that&apos;s OK.</p>
                <p className="mt-1 text-[var(--color-muted)]">
                  {data.nextMatch
                    ? `Next chance to earn: predict ${data.nextMatch} before kickoff.`
                    : "Your next chance is coming up."}{" "}
                  You can still climb. 🔥
                </p>
              </div>
            )}

            <Link
              href={`/copa/${data.slug}`}
              className="mt-5 block rounded-xl border-2 border-[var(--color-navy)] px-4 py-3 text-center text-sm font-bold text-[var(--color-navy)] transition hover:bg-[var(--color-navy)] hover:text-white"
            >
              View full bracket →
            </Link>
          </>
        )}

        {!loading && !data && (
          <p className="mt-8 text-center text-sm text-[var(--color-muted)]">Couldn&apos;t load this ledger.</p>
        )}
      </div>
    </div>
  );
}

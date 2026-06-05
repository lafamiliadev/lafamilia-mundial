"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyPreviewStage, clearPreview } from "@/app/actions/preview";
import { PREVIEW_STAGES } from "@/lib/preview-stages";
import type { PreviewStageKey } from "@/lib/preview-stages";

// Dev-only QA panel: jump the whole app to a tournament stage (simulated clock
// + seeded results) so you can see each stage's UX without waiting for real
// dates or live data. Never rendered in production (gated in PreviewMount).
export function PreviewPanel({ active }: { active: PreviewStageKey | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const go = (key: PreviewStageKey) =>
    start(async () => {
      await applyPreviewStage(key);
      router.refresh();
    });
  const reset = () =>
    start(async () => {
      await clearPreview();
      router.refresh();
    });

  const activeStage = PREVIEW_STAGES.find((s) => s.key === active) ?? null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-[60] flex items-center gap-1.5 rounded-full bg-[var(--color-navy)] px-3.5 py-2 text-xs font-bold text-white shadow-lg ring-1 ring-black/20"
      >
        🔧 Preview{activeStage ? `: ${activeStage.label}` : ""}
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[60] w-72 rounded-2xl bg-[var(--color-navy)] p-3 text-white shadow-2xl ring-1 ring-black/20">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
          🔧 Tournament preview · dev only
        </p>
        <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white" aria-label="Close">
          ✕
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-white/60">
        Simulates the clock + results so you can QA each stage. Affects this local
        session only.
      </p>

      <div className="space-y-1.5">
        {PREVIEW_STAGES.map((s) => {
          const isActive = (active ?? "pre") === s.key;
          return (
            <button
              key={s.key}
              onClick={() => go(s.key)}
              disabled={pending}
              className={`block w-full rounded-xl px-3 py-2 text-left transition disabled:opacity-50 ${
                isActive ? "bg-[var(--color-gold)] text-[#3a2b00]" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <span className="block text-sm font-bold">{s.label}</span>
              <span className={`block text-[11px] leading-tight ${isActive ? "text-[#3a2b00]/80" : "text-white/55"}`}>
                {s.blurb}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={reset}
        disabled={pending}
        className="mt-3 w-full rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 disabled:opacity-50"
      >
        ↺ Reset to live
      </button>

      <p className="mt-2 text-[10px] leading-snug text-white/40">
        Note: the ticking countdown still uses your real clock; stage states,
        open picks, and the leaderboard reflect the simulated time.
      </p>
    </div>
  );
}

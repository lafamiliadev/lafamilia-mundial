"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s, done: ms === 0 };
}

const Cell = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="min-w-[3.25rem] rounded-xl bg-white/12 px-2 py-2 text-center text-2xl font-extrabold tabular-nums text-white">
      {String(value).padStart(2, "0")}
    </div>
    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
      {label}
    </span>
  </div>
);

export function Countdown({ lockTime }: { lockTime: string }) {
  const target = new Date(lockTime).getTime();
  // Start null so SSR and the first client paint match (the clock only differs
  // once mounted) — avoids a hydration mismatch on the ticking digits.
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!t) {
    return (
      <div className="flex items-end gap-2">
        <Cell value={0} label="days" />
        <Cell value={0} label="hrs" />
        <Cell value={0} label="min" />
        <Cell value={0} label="sec" />
      </div>
    );
  }

  if (t.done) {
    return (
      <p className="text-sm font-semibold text-[var(--color-gold-soft)]">
        🔒 Predictions are locked — the tournament is underway!
      </p>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Cell value={t.d} label="days" />
      <Cell value={t.h} label="hrs" />
      <Cell value={t.m} label="min" />
      <Cell value={t.s} label="sec" />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

// Full-screen fiesta for the moment the tournament is decided: confetti in the
// champion's colors + a Spanish cheer card. Renders ONCE per browser session
// (tab-switching around the leaderboard shouldn't re-burst it), skips entirely
// for prefers-reduced-motion, and removes itself after ~6.5s. Pure CSS — no
// animation libraries.

type Piece = {
  left: number;
  delay: number;
  dur: number;
  color: string;
  size: number;
  tilt: number;
  sway: number;
};

// Spain red & yellow, trophy gold, white, pitch green.
const COLORS = ["#C60B1E", "#FFC400", "#f5b301", "#ffffff", "#0a7d33"];

export function ChampionCelebration({ flag, name }: { flag: string; name: string }) {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("copa-final-fiesta")) return;
      sessionStorage.setItem("copa-final-fiesta", "1");
    } catch {
      /* storage unavailable (private mode) — celebrate anyway */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Deferred one frame so the burst never blocks the first paint (and to keep
    // the effect free of synchronous state updates).
    const raf = requestAnimationFrame(() =>
      setPieces(
        Array.from({ length: 80 }, (_, i) => ({
          left: Math.random() * 100,
          delay: Math.random() * 2.2,
          dur: 3 + Math.random() * 2.5,
          color: COLORS[i % COLORS.length],
          size: 6 + Math.random() * 7,
          tilt: Math.random() * 360,
          sway: 20 + Math.random() * 40,
        })),
      ),
    );
    const t = setTimeout(() => setPieces(null), 6500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  if (!pieces) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style>{`
        @keyframes copa-fall { 0% { transform: translateY(-6vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(106vh) rotate(720deg); opacity: .85; } }
        @keyframes copa-sway { 0%, 100% { margin-left: 0; } 50% { margin-left: var(--sway); } }
        @keyframes copa-cheer { 0% { opacity: 0; transform: scale(.7); } 12% { opacity: 1; transform: scale(1.06); } 20% { transform: scale(1); } 78% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-3vh",
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            borderRadius: 2,
            ["--sway" as string]: `${p.sway}px`,
            transform: `rotate(${p.tilt}deg)`,
            animation: `copa-fall ${p.dur}s linear ${p.delay}s both, copa-sway ${(p.dur / 2).toFixed(2)}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <div className="flex h-full items-start justify-center pt-[18vh]">
        <div
          style={{ animation: "copa-cheer 4.6s ease-out both" }}
          className="mx-4 rounded-3xl bg-[var(--color-navy)]/95 px-7 py-5 text-center text-white shadow-2xl"
        >
          <p className="text-4xl leading-none">{flag}</p>
          <p className="mt-2 text-3xl font-black tracking-wide">¡CAMPEONES!</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-gold-soft)]">
            {name} — ¡olé, olé, olé! 🎉⚽
          </p>
        </div>
      </div>
    </div>
  );
}

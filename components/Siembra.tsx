import Link from "next/link";

const SIEMBRA_URL = "https://givebutter.com/siembra-con-lafamilia-foundation";

// Mission CTA for the Siembra campaign — one of the core reasons this app
// exists. Warm, community-first, never mandatory, never blocking the game.

export function SiembraCTA() {
  return (
    <section className="card overflow-hidden">
      <div className="bg-[var(--color-navy)] px-5 py-6 text-white">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🌱</span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Plant a seed for the next generation
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Siembra helps LaFamilia create more opportunities for Latine founders and grow our
              representation in VC.
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--color-gold-soft)]">
              Because when one of us gets in the room, we help bring more of us in.
            </p>
          </div>
        </div>
        <Link
          href={SIEMBRA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-gold)] px-6 text-base font-bold text-[#3a2b00] transition active:scale-[0.98]"
        >
          🌱 Support Siembra
        </Link>
      </div>
    </section>
  );
}

/** Lighter, non-intrusive banner — used on the leaderboard so it never blocks the game. */
export function SiembraBanner() {
  return (
    <Link
      href={SIEMBRA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 transition hover:border-[var(--color-siembra)]"
    >
      <span className="text-2xl">🌱</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">Plant a seed for the next generation</p>
        <p className="truncate text-xs text-[var(--color-muted)]">
          Support Siembra — more Latine founders in the room.
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-[var(--color-siembra)] px-3 py-1.5 text-xs font-bold text-white">
        Support →
      </span>
    </Link>
  );
}

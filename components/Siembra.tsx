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
              Support LaFamilia through Siembra
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Siembra is LaFamilia&apos;s foundation. Your gift helps more Latine founders and
              investors find their way into the room.
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--color-gold-soft)]">
              When one of us gets in the room, we open the door for the next.
            </p>
          </div>
        </div>
        <Link
          href={SIEMBRA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-gold)] px-6 text-base font-bold text-[#3a2b00] transition active:scale-[0.98]"
        >
          🌱 Give to Siembra
        </Link>
      </div>
    </section>
  );
}

/** Prominent mission banner for the top of the leaderboard. */
export function SiembraBanner() {
  return (
    <Link
      href={SIEMBRA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-[var(--color-navy)] px-4 py-3.5 text-white transition active:scale-[0.99]"
    >
      <span className="text-2xl">🌱</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-tight">Support LaFamilia through Siembra</p>
        <p className="truncate text-xs text-white/80">Help put more Latine founders in the room.</p>
      </div>
      <span className="shrink-0 rounded-full bg-[var(--color-gold)] px-4 py-2 text-xs font-bold text-[#3a2b00]">
        Donate
      </span>
    </Link>
  );
}

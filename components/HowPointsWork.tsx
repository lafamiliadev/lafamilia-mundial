// A plain-language explainer of the one-game model, for non-experts. Native
// <details> (no client JS) so it sits quietly on the Picks hub, always there
// when someone wants it. One game, four ways to earn — never internal jargon.
export function HowPointsWork() {
  const rows = [
    { emoji: "🗂️", title: "Your bracket", desc: "Your 3-minute picks — the 12 group winners, your Final Four, and the champion." },
    { emoji: "⚽", title: "Predict the score", desc: "Call the exact score of LatAm + Spain matches. +3 if you nail it, +1 for the right winner." },
    { emoji: "🏆", title: "Pick who advances", desc: "In the knockout rounds, pick which team moves on — every round." },
    { emoji: "🎁", title: "Bonus Picks", desc: "Golden Ball, Boot, Glove, and a Dark Horse — set once, before kickoff." },
  ];
  return (
    <details className="card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 [&::-webkit-details-marker]:hidden">
        <span className="font-bold">ⓘ How points work</span>
        <span className="text-[var(--color-muted)]">▾</span>
      </summary>
      <div className="px-4 pb-4">
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          It&apos;s all one score. Make your bracket, then keep earning all tournament long.
        </p>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.title} className="flex gap-3">
              <span className="text-xl leading-none" aria-hidden>
                {r.emoji}
              </span>
              <div>
                <p className="text-sm font-bold">{r.title}</p>
                <p className="text-sm leading-snug text-[var(--color-muted)]">{r.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

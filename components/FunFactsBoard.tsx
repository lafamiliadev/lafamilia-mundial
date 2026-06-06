import { CopyButton } from "./admin";
import { computeFunFacts } from "@/lib/fun-facts";
import type { Participant } from "@/lib/types";

// Admin-only Fun Facts list. Casual, group-chat-style observations the admin can
// paste straight into WhatsApp. Recomputes on every admin load (force-dynamic),
// so it always reflects the latest picks/leaderboard. Players never see this.
export function FunFactsBoard({
  participants,
  dateLabel,
}: {
  participants: Participant[];
  dateLabel: string;
}) {
  const facts = computeFunFacts(participants);

  if (facts.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No fun facts yet — they appear as soon as a few people lock in their picks.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-[var(--color-muted)]">
        {dateLabel} · {facts.length} to choose from · updates live as picks come in
      </p>
      <ul className="space-y-3">
        {facts.map((f) => (
          <li key={f.id} className="rounded-2xl border border-[var(--color-line)] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold leading-tight">
                <span aria-hidden>{f.emoji}</span> {f.title}
              </p>
              <CopyButton text={f.whatsapp} />
            </div>
            <p className="mt-1.5 text-sm">{f.dataSays}</p>
            <p className="mt-0.5 text-xs italic text-[var(--color-muted)]">{f.why}</p>
            <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-[#e8f7ee] px-3 py-2.5 text-sm text-[var(--color-ink)]">
              <span aria-hidden className="shrink-0">💬</span>
              <span>{f.whatsapp}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

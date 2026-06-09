import { CopyButton } from "./admin";
import { computeFunFacts } from "@/lib/fun-facts";
import type { Participant } from "@/lib/types";

// Admin-only Fun Facts — a clean, scannable list of plain factual one-liners the
// admin can lift into WhatsApp in their own voice (no pre-written captions).
// Recomputes on every admin load (force-dynamic). Players never see this.
export function FunFactsBoard({
  participants,
  dateLabel,
}: {
  participants: Participant[];
  dateLabel: string;
}) {
  const facts = computeFunFacts(participants);

  // With any submissions at all, computeFunFacts always returns at least the
  // baseline facts — so this only shows before the very first pick comes in.
  if (facts.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Fun facts will appear here the moment the first person submits their picks.
      </p>
    );
  }

  const allText = facts.map((f) => f.dataSays).join("\n");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--color-muted)]">
          {dateLabel} · {facts.length} facts · updates live as picks come in
        </p>
        <CopyButton text={allText} label="Copy all" />
      </div>
      <ul className="divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)]">
        {facts.map((f) => (
          <li key={f.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <p className="text-sm leading-snug">
              <span aria-hidden className="mr-1.5">
                {f.emoji}
              </span>
              {f.dataSays}
            </p>
            <CopyButton text={f.dataSays} />
          </li>
        ))}
      </ul>
    </div>
  );
}

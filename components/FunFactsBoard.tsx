import { CopyButton } from "./admin";
import { computeFunFacts } from "@/lib/fun-facts";
import type { Participant } from "@/lib/types";

// Admin-only Fun Facts — short, human observations about the Familia's picks,
// ready to paste into WhatsApp as-is (or tweak in your own voice). Recomputes on
// every admin load (force-dynamic). Players see these on /awards too.
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
        Observations show up here the moment the first person submits their picks.
      </p>
    );
  }

  const allText = facts.map((f) => f.text).join("\n\n———\n\n");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--color-muted)]">
          {dateLabel} · {facts.length} observations · updates live as picks come in
        </p>
        <CopyButton text={allText} label="Copy all" />
      </div>
      <ul className="space-y-2.5">
        {facts.map((f) => (
          <li
            key={f.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--color-line)] p-4"
          >
            <p className="whitespace-pre-line text-sm leading-relaxed">{f.text}</p>
            <CopyButton text={f.text} />
          </li>
        ))}
      </ul>
    </div>
  );
}

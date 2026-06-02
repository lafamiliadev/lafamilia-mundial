import { LinkButton, PageShell, SectionTitle, TopNav } from "@/components/ui";
import { computeInsights, type InsightBlock } from "@/lib/insights";
import { listPublicParticipants } from "@/lib/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community insights · La Copa de LaFamilia 2026" };

function Block({ block }: { block: InsightBlock }) {
  const max = Math.max(...block.bars.map((b) => b.pct), 1);
  return (
    <div className="card p-5">
      <SectionTitle emoji={block.emoji}>{block.title}</SectionTitle>
      <div className="mt-4 space-y-3">
        {block.bars.map((b) => (
          <div key={b.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold">
                {b.flag ? `${b.flag} ` : ""}
                {b.label}
              </span>
              <span className="tabular-nums text-[var(--color-muted)]">{b.pct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
              <div
                className="h-full rounded-full bg-[var(--color-pitch)]"
                style={{ width: `${(b.pct / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function InsightsPage() {
  const participants = await listPublicParticipants();
  const blocks = computeInsights(participants);
  const hasData = participants.length > 0;

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="insights" />
      <PageShell>
        <div className="py-6">
          <SectionTitle emoji="📊">Community insights</SectionTitle>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            What {participants.length} of Familia are predicting. Updates live as picks roll in.
          </p>
        </div>

        {!hasData ? (
          <div className="card p-8 text-center">
            <div className="text-4xl">🌱</div>
            <p className="mt-3 font-bold">Insights bloom as picks roll in</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Be one of the first to shape the community story.
            </p>
            <LinkButton href="/play" variant="primary" className="mt-5 w-full">
              Make your predictions →
            </LinkButton>
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((b) =>
              b.bars.length ? <Block key={b.id} block={b} /> : null,
            )}
          </div>
        )}
      </PageShell>
    </main>
  );
}

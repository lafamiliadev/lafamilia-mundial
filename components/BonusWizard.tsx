"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PickGrid, type PickOption } from "./PickGrid";
import { Button, cn } from "./ui";
import { saveBonusPicks } from "@/app/actions/bonus";
import { DARK_HORSE_TEAMS } from "@/lib/dark-horse";
import {
  GOLDEN_BALL_ALL,
  GOLDEN_BALL_FEATURED,
  GOLDEN_BOOT_PLAYERS,
  GOLDEN_GLOVE_ALL,
  GOLDEN_GLOVE_FEATURED,
  type Player,
} from "@/lib/players";
import { teamFlag, teamName } from "@/lib/teams";
import type { BonusPicks } from "@/lib/types";

/** Fold accents + lowercase so "modric" matches "Modrić", "mbappe" → "Mbappé". */
const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const teamOpt = (code: string): PickOption => ({
  key: code,
  label: teamName(code),
  flag: teamFlag(code),
});

/**
 * A player picker that shows a short featured shortlist by default, but searches
 * the full eligible pool the moment the member types. Keeps the mobile flow fast
 * while still letting people find anyone (past Golden Ball winners include
 * midfielders and keepers, not just strikers).
 */
function FeaturedPlayerGrid({
  featured,
  all,
  value,
  onChange,
}: {
  featured: Player[];
  all: Player[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const needle = fold(q.trim());
  const list = useMemo(() => {
    if (!needle) {
      // Default view: the featured shortlist. Guard against an empty featured
      // set (would render a blank screen) by falling back to the full list.
      const base = (featured.length ? featured : all.slice(0, 12)).slice();
      // Always include the current pick even if it's outside the default set.
      if (value && !base.some((p) => p.id === value)) {
        const extra = all.find((p) => p.id === value);
        if (extra) base.unshift(extra);
      }
      return base;
    }
    return all.filter(
      (p) =>
        fold(p.name).includes(needle) ||
        fold(p.id).includes(needle) ||
        fold(teamName(p.teamCode)).includes(needle),
    );
  }, [needle, featured, all, value]);

  return (
    <div>
      <input
        type="text"
        inputMode="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search any player…"
        className="mb-3 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--color-pitch)]"
      />
      {!needle && (
        <p className="mb-2 text-xs font-semibold text-[var(--color-muted)]">
          Popular picks — or search for anyone.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {list.map((p) => {
          const selected = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(selected ? null : p.id)}
              aria-pressed={selected}
              className={cn(
                "pick card flex flex-col items-center justify-center gap-1 px-2 py-4 text-center",
                selected && "pick-selected",
              )}
            >
              <span className="text-3xl leading-none">{teamFlag(p.teamCode)}</span>
              <span className="text-sm font-bold leading-tight">{p.name}</span>
              <span className="text-[11px] text-[var(--color-muted)]">{teamName(p.teamCode)}</span>
            </button>
          );
        })}
        {needle && list.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--color-muted)]">
            No matches for “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}

type Step = {
  key: keyof BonusPicks;
  title: string;
  hint: string;
  points: number;
  body: React.ReactNode;
};

export function BonusWizard({
  token,
  initial,
  weights,
}: {
  token: string;
  initial: BonusPicks;
  weights: { goldenBall: number; goldenBoot: number; goldenGlove: number; darkHorseSf: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [b, setB] = useState<BonusPicks>(initial);

  const set = (k: keyof BonusPicks, v: string | null) =>
    setB((prev) => ({ ...prev, [k]: v }));

  const steps: Step[] = [
    {
      key: "goldenBall",
      title: "Golden Ball — best player 🥇",
      hint: "The standout player of the whole tournament. Any position.",
      points: weights.goldenBall,
      body: (
        <FeaturedPlayerGrid
          featured={GOLDEN_BALL_FEATURED}
          all={GOLDEN_BALL_ALL}
          value={b.goldenBall}
          onChange={(v) => set("goldenBall", v)}
        />
      ),
    },
    {
      key: "goldenBoot",
      title: "Golden Boot — top scorer ⚽",
      hint: "Who finishes the tournament with the most goals?",
      points: weights.goldenBoot,
      body: (
        <FeaturedPlayerGrid
          featured={GOLDEN_BOOT_PLAYERS.filter((p) => p.featured)}
          all={GOLDEN_BOOT_PLAYERS}
          value={b.goldenBoot}
          onChange={(v) => set("goldenBoot", v)}
        />
      ),
    },
    {
      key: "goldenGlove",
      title: "Golden Glove — best keeper 🧤",
      hint: "The goalkeeper of the tournament.",
      points: weights.goldenGlove,
      body: (
        <FeaturedPlayerGrid
          featured={GOLDEN_GLOVE_FEATURED}
          all={GOLDEN_GLOVE_ALL}
          value={b.goldenGlove}
          onChange={(v) => set("goldenGlove", v)}
        />
      ),
    },
    {
      key: "darkHorse",
      title: "Dark Horse — the surprise 🐴",
      hint: "Pick an outsider to go deep. The further they reach, the more you score.",
      points: weights.darkHorseSf,
      body: (
        <PickGrid
          options={DARK_HORSE_TEAMS.map(teamOpt)}
          value={b.darkHorse}
          onChange={(v) => set("darkHorse", v)}
        />
      ),
    },
  ];

  const isReview = step === steps.length;
  const total = steps.length + 1;
  const progress = Math.round(((step + (isReview ? 1 : 0)) / total) * 100);
  const filled = Object.values(b).filter(Boolean).length;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveBonusPicks({ token, ...b });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/picks?saved=bonus`);
    });
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4">
      {/* Progress */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] pb-3 pt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--color-muted)]">
          <button
            onClick={() => (step === 0 ? router.push("/picks") : setStep((x) => x - 1))}
            className="rounded-full px-2 py-1 hover:bg-black/5"
          >
            ← Back
          </button>
          <span>{isReview ? "Review" : `Bonus Pick ${step + 1} of ${steps.length}`}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
          <div
            className="h-full rounded-full bg-[var(--color-gold)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div key={isReview ? "review" : step} className="animate-pop flex-1 py-4">
        {!isReview ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{steps[step].title}</h1>
              <span className="mt-1 shrink-0 rounded-full bg-[var(--color-gold-soft)]/60 px-2.5 py-1 text-xs font-bold text-[#3a2b00]">
                {steps[step].points} pts
              </span>
            </div>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">{steps[step].hint}</p>
            <div className="mt-5">{steps[step].body}</div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Review your Bonus Picks 📋</h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              Tap any row to change it. You can edit anytime before kickoff.
            </p>
            <div className="card mt-5 divide-y divide-[var(--color-line)]">
              {steps.map((s, i) => {
                const v = b[s.key];
                const label = v
                  ? s.key === "darkHorse"
                    ? `${teamFlag(v)} ${teamName(v)}`
                    : (GOLDEN_BALL_ALL.find((p) => p.id === v) ??
                        GOLDEN_BOOT_PLAYERS.find((p) => p.id === v) ??
                        GOLDEN_GLOVE_ALL.find((p) => p.id === v))?.name ?? v
                  : "— skipped";
                return (
                  <button
                    key={s.key}
                    onClick={() => setStep(i)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02]"
                  >
                    <span className="shrink-0 text-sm text-[var(--color-muted)]">
                      {s.title.split(" — ")[0]}
                    </span>
                    <span className="truncate text-right font-semibold">{label} ›</span>
                  </button>
                );
              })}
            </div>
            {filled < steps.length && (
              <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
                You can leave any pick blank — but each one is points on the table.
              </p>
            )}
            {error && (
              <div className="mt-4 rounded-2xl bg-[var(--color-coral)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-coral)]">
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer action */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
        {!isReview ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setStep((x) => x + 1)}
              className="px-5"
            >
              Skip
            </Button>
            <Button onClick={() => setStep((x) => x + 1)} className="flex-1">
              Continue →
            </Button>
          </div>
        ) : (
          <Button variant="gold" onClick={save} disabled={pending} className="w-full text-lg">
            {pending ? "Saving…" : "Save Bonus Picks 🎉"}
          </Button>
        )}
      </div>
    </div>
  );
}

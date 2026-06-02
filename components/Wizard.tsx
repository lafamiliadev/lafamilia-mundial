"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PickGrid, type PickOption } from "./PickGrid";
import { Button, cn } from "./ui";
import { LATAM_TEAMS, TEAMS, teamFlag, teamName } from "@/lib/teams";
import { PLAYERS, playerName } from "@/lib/players";
import { submitPredictions, updatePredictions } from "@/app/actions/predictions";

type State = {
  name: string;
  email: string;
  rootingCountry: string | null;
  champion: string | null;
  runnerUp: string | null;
  goldenBoot: string | null;
  darkHorse: string | null;
  latamFurthest: string | null;
  finalTotalGoals: number | null;
};

const EMPTY: State = {
  name: "",
  email: "",
  rootingCountry: null,
  champion: null,
  runnerUp: null,
  goldenBoot: null,
  darkHorse: null,
  latamFurthest: null,
  finalTotalGoals: 3,
};

const STORAGE_KEY = "mundial26:draft:v1";

const teamOptions: PickOption[] = [...TEAMS]
  .sort((a, b) => Number(b.qualified) - Number(a.qualified) || a.name.localeCompare(b.name))
  .map((t) => ({ key: t.code, label: t.name, flag: t.flag }));

const latamOptions: PickOption[] = LATAM_TEAMS.map((t) => ({
  key: t.code,
  label: t.name,
  flag: t.flag,
}));

const playerOptions: PickOption[] = PLAYERS.map((p) => ({
  key: p.id,
  label: p.name,
  sublabel: teamName(p.teamCode),
  flag: teamFlag(p.teamCode),
}));

export function Wizard({
  mode = "create",
  token,
  initial,
  referrer,
}: {
  mode?: "create" | "edit";
  token?: string;
  initial?: Partial<State>;
  /** Slug of the participant whose share link brought this user in. */
  referrer?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [s, setS] = useState<State>({ ...EMPTY, ...initial });

  // Persist drafts only for new entries (resume already has server state).
  useEffect(() => {
    if (mode !== "create") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setS((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (mode !== "create") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }, [s, mode]);

  const set = <K extends keyof State>(k: K, v: State[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  type StepDef = {
    title: string;
    hint?: string;
    body: React.ReactNode;
    canNext: boolean;
    optional?: boolean;
  };

  const steps: StepDef[] = useMemo(() => {
    const validEmail = /.+@.+\..+/.test(s.email);
    return [
      {
        title: "Welcome! Who's playing?",
        hint: "We use your email only to save your entry — no spam, no password.",
        canNext: s.name.trim().length > 0 && validEmail,
        body: (
          <div className="space-y-3">
            <input
              autoFocus
              value={s.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 text-lg outline-none focus:border-[var(--color-pitch)]"
            />
            <input
              type="email"
              inputMode="email"
              value={s.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 text-lg outline-none focus:border-[var(--color-pitch)]"
            />
          </div>
        ),
      },
      {
        title: "Who are you rooting for? 🌎",
        hint: "Your team — win or lose, you're with them.",
        canNext: !!s.rootingCountry,
        body: (
          <PickGrid
            options={teamOptions}
            value={s.rootingCountry}
            onChange={(v) => set("rootingCountry", v)}
            searchable
            searchPlaceholder="Search countries…"
          />
        ),
      },
      {
        title: "Who wins the World Cup? 🏆",
        hint: "Your champion pick — worth the most points.",
        canNext: !!s.champion,
        body: (
          <PickGrid
            options={teamOptions}
            value={s.champion}
            onChange={(v) => set("champion", v)}
            searchable
            searchPlaceholder="Search teams…"
          />
        ),
      },
      {
        title: "Who finishes runner-up? 🥈",
        hint: "The team that makes the final but falls just short.",
        canNext: !!s.runnerUp,
        body: (
          <PickGrid
            options={teamOptions.filter((o) => o.key !== s.champion)}
            value={s.runnerUp}
            onChange={(v) => set("runnerUp", v)}
            searchable
            searchPlaceholder="Search teams…"
          />
        ),
      },
      {
        title: "Golden Boot winner? 🥅",
        hint: "Top scorer of the tournament. Not sure? Skip it.",
        optional: true,
        canNext: true,
        body: (
          <PickGrid
            options={playerOptions}
            value={s.goldenBoot}
            onChange={(v) => set("goldenBoot", v)}
            searchable
            searchPlaceholder="Search players…"
            allowNone={{ key: "__none", label: "Not sure yet" }}
          />
        ),
      },
      {
        title: "Pick your dark horse 🔥",
        hint: "Which team will surprise everyone? Outsiders score bonus points.",
        canNext: !!s.darkHorse,
        body: (
          <PickGrid
            options={teamOptions}
            value={s.darkHorse}
            onChange={(v) => set("darkHorse", v)}
            searchable
            searchPlaceholder="Search teams…"
          />
        ),
      },
      {
        title: "LatAm team that goes furthest 🌶️",
        hint: "Which Latin American side carries the region deepest?",
        canNext: !!s.latamFurthest,
        body: (
          <PickGrid
            options={latamOptions}
            value={s.latamFurthest}
            onChange={(v) => set("latamFurthest", v)}
            searchable
            searchPlaceholder="Search LatAm teams…"
          />
        ),
      },
      {
        title: "Tiebreaker: How many total goals will be scored in the final? ⚽",
        hint: "Closest prediction breaks ties on the leaderboard. Count both teams combined.",
        optional: true,
        canNext: true,
        body: (
          <div className="flex items-center justify-center gap-6 py-4">
            <button
              type="button"
              onClick={() => set("finalTotalGoals", Math.max(0, (s.finalTotalGoals ?? 0) - 1))}
              className="card h-16 w-16 text-3xl font-black"
            >
              −
            </button>
            <span className="w-16 text-center text-5xl font-black tabular-nums">
              {s.finalTotalGoals ?? 0}
            </span>
            <button
              type="button"
              onClick={() => set("finalTotalGoals", Math.min(20, (s.finalTotalGoals ?? 0) + 1))}
              className="card h-16 w-16 text-3xl font-black"
            >
              +
            </button>
          </div>
        ),
      },
    ];
  }, [s]);

  const isReview = step === steps.length;
  const total = steps.length + 1;
  const progress = Math.round(((step + (isReview ? 1 : 0)) / total) * 100);

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name: s.name,
        email: s.email,
        rootingCountry: s.rootingCountry,
        champion: s.champion,
        runnerUp: s.runnerUp,
        goldenBoot: s.goldenBoot === "__none" ? null : s.goldenBoot,
        darkHorse: s.darkHorse,
        latamFurthest: s.latamFurthest,
        finalTotalGoals: s.finalTotalGoals,
      };
      const res =
        mode === "edit" && token
          ? await updatePredictions({ token, ...payload })
          : await submitPredictions({ ...payload, ref: referrer ?? null });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      router.push(`/done?token=${res.token}`);
    });
  }

  const reviewRows: { label: string; value: string }[] = [
    { label: "Rooting for", value: `${teamFlag(s.rootingCountry)} ${teamName(s.rootingCountry)}` },
    { label: "Champion", value: `${teamFlag(s.champion)} ${teamName(s.champion)}` },
    { label: "Runner-up", value: `${teamFlag(s.runnerUp)} ${teamName(s.runnerUp)}` },
    { label: "Golden Boot", value: playerName(s.goldenBoot === "__none" ? null : s.goldenBoot) },
    { label: "Dark horse", value: `${teamFlag(s.darkHorse)} ${teamName(s.darkHorse)}` },
    { label: "LatAm furthest", value: `${teamFlag(s.latamFurthest)} ${teamName(s.latamFurthest)}` },
    { label: "Goals in final", value: String(s.finalTotalGoals ?? "—") },
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4">
      {/* Progress */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] pb-3 pt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--color-muted)]">
          <button
            onClick={() => (step === 0 ? router.push("/") : setStep((x) => x - 1))}
            className="rounded-full px-2 py-1 hover:bg-black/5"
          >
            ← Back
          </button>
          <span>
            {isReview ? "Review" : `Step ${step + 1} of ${total}`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
          <div
            className="h-full rounded-full bg-[var(--color-pitch)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div key={isReview ? "review" : step} className="animate-pop flex-1 py-4">
        {!isReview ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">{steps[step].title}</h1>
            {steps[step].hint && (
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">{steps[step].hint}</p>
            )}
            <div className="mt-5">{steps[step].body}</div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Review your bracket 📋</h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              Tap any row to change it. You can edit anytime before kickoff.
            </p>
            <div className="card mt-5 divide-y divide-[var(--color-line)]">
              {reviewRows.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setStep(i === 0 ? 1 : i + 1)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-black/[0.02]"
                >
                  <span className="text-sm text-[var(--color-muted)]">{r.label}</span>
                  <span className="font-semibold">{r.value} ›</span>
                </button>
              ))}
            </div>
            {error && (
              <p className="mt-4 rounded-2xl bg-[var(--color-coral)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-coral)]">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer action */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
        {!isReview ? (
          <div className="flex items-center gap-3">
            {steps[step].optional && (
              <Button
                variant="ghost"
                onClick={() => setStep((x) => x + 1)}
                className="flex-1"
              >
                Skip
              </Button>
            )}
            <Button
              onClick={() => setStep((x) => x + 1)}
              disabled={!steps[step].canNext}
              className={cn(steps[step].optional ? "flex-1" : "w-full")}
            >
              Continue →
            </Button>
          </div>
        ) : (
          <Button variant="gold" onClick={submit} disabled={pending} className="w-full text-lg">
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Submit predictions 🎉"}
          </Button>
        )}
      </div>
    </div>
  );
}

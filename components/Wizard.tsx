"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GroupWinners } from "./GroupWinners";
import { MultiPickGrid } from "./MultiPickGrid";
import { PickGrid, type PickOption } from "./PickGrid";
import { Button, cn } from "./ui";
import { TEAMS, teamFlag, teamName } from "@/lib/teams";
import { submitPredictions, updatePredictions } from "@/app/actions/predictions";
import type { GroupMap } from "@/lib/types";

type State = {
  name: string;
  email: string;
  rootingCountry: string | null;
  groupWinners: Record<string, string>;
  semifinalists: string[];
  champion: string | null;
  finalTotalGoals: number | null;
};

const EMPTY: State = {
  name: "",
  email: "",
  rootingCountry: null,
  groupWinners: {},
  semifinalists: [],
  champion: null,
  finalTotalGoals: 3,
};

const STORAGE_KEY = "mundial26:draft:v2";

const teamOptions: PickOption[] = [...TEAMS]
  .sort((a, b) => Number(b.qualified) - Number(a.qualified) || a.name.localeCompare(b.name))
  .map((t) => ({ key: t.code, label: t.name, flag: t.flag }));

export function Wizard({
  mode = "create",
  token,
  initial,
  referrer,
  groups,
}: {
  mode?: "create" | "edit";
  token?: string;
  initial?: Partial<State>;
  /** Slug of the participant whose share link brought this user in. */
  referrer?: string | null;
  /** Group composition (letter → team codes), source of truth from the provider. */
  groups: GroupMap;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
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

  // Fresh step → start at the top so the question + first options are in view.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, [step]);

  const set = <K extends keyof State>(k: K, v: State[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  // After picking from a grid, glide back to the top so the Continue button is
  // the obvious next move. Only on an actual selection.
  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  const pick = <K extends keyof State>(k: K, v: State[K]) => {
    set(k, v);
    if (v !== null) scrollToTop();
  };

  // Toggle a Final Four pick (cap 4); if a removed team was the champion, clear it.
  const toggleSemifinalist = (code: string) => {
    setS((prev) => {
      const has = prev.semifinalists.includes(code);
      if (has) {
        const semis = prev.semifinalists.filter((c) => c !== code);
        return { ...prev, semifinalists: semis, champion: prev.champion === code ? null : prev.champion };
      }
      if (prev.semifinalists.length >= 4) return prev;
      return { ...prev, semifinalists: [...prev.semifinalists, code] };
    });
  };

  const groupCount = Object.keys(groups).length;
  const groupsFilled = Object.keys(groups).filter((l) => s.groupWinners[l]).length;

  const championOptions: PickOption[] = s.semifinalists.map((code) => ({
    key: code,
    label: teamName(code),
    flag: teamFlag(code),
  }));

  type StepDef = {
    title: string;
    hint?: string;
    body: React.ReactNode;
    canNext: boolean;
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
        hint: "Your team — win or lose, you're with them. (Just for flavor, not scored.)",
        canNext: !!s.rootingCountry,
        body: (
          <PickGrid
            options={teamOptions}
            value={s.rootingCountry}
            onChange={(v) => pick("rootingCountry", v)}
            searchable
            searchPlaceholder="Search countries…"
          />
        ),
      },
      {
        title: "Call the 12 group winners 🥇",
        hint: "Tap the team you think finishes 1st in each group. Points land when the group stage ends.",
        canNext: groupCount > 0 && groupsFilled === groupCount,
        body: (
          <GroupWinners
            groups={groups}
            value={s.groupWinners}
            onChange={(next) => set("groupWinners", next)}
          />
        ),
      },
      {
        title: "Pick your Final Four 🔥",
        hint: "Choose 4 teams you think reach the semifinals.",
        canNext: s.semifinalists.length === 4,
        body: (
          <MultiPickGrid
            options={teamOptions}
            selected={s.semifinalists}
            onToggle={toggleSemifinalist}
            max={4}
            searchPlaceholder="Search teams…"
          />
        ),
      },
      {
        title: "And the champion? 🏆",
        hint: "Your winner — pick from your Final Four.",
        canNext: !!s.champion,
        body:
          championOptions.length > 0 ? (
            <PickGrid
              options={championOptions}
              value={s.champion}
              onChange={(v) => pick("champion", v)}
            />
          ) : (
            <p className="card p-5 text-center text-sm text-[var(--color-muted)]">
              Pick your Final Four first, then choose the champion.
            </p>
          ),
      },
      {
        title: "Tiebreaker: total goals in the final? ⚽",
        hint: "Closest prediction breaks ties on the leaderboard. Count both teams combined.",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, groups]);

  const isReview = step === steps.length;
  const total = steps.length + 1;
  const progress = Math.round(((step + (isReview ? 1 : 0)) / total) * 100);

  function submit() {
    setError(null);
    setEmailExists(false);
    startTransition(async () => {
      const payload = {
        name: s.name,
        email: s.email,
        rootingCountry: s.rootingCountry,
        groupWinners: Object.keys(s.groupWinners).length ? s.groupWinners : null,
        semifinalists: s.semifinalists.length ? s.semifinalists : null,
        champion: s.champion,
        finalTotalGoals: s.finalTotalGoals,
      };
      const res =
        mode === "edit" && token
          ? await updatePredictions({ token, ...payload })
          : await submitPredictions({ ...payload, ref: referrer ?? null });
      if (!res.ok) {
        setError(res.error);
        if (res.code === "EMAIL_EXISTS") setEmailExists(true);
        return;
      }
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      router.push(`/done?token=${res.token}`);
    });
  }

  const winnerFlags = Object.keys(groups)
    .sort()
    .map((l) => s.groupWinners[l])
    .filter(Boolean);

  const reviewRows: { label: string; value: string; step: number }[] = [
    { label: "Rooting for", value: `${teamFlag(s.rootingCountry)} ${teamName(s.rootingCountry)}`, step: 1 },
    {
      label: "Group winners",
      value: winnerFlags.length ? winnerFlags.map((c) => teamFlag(c)).join(" ") : "—",
      step: 2,
    },
    {
      label: "Final Four",
      value: s.semifinalists.length
        ? s.semifinalists.map((c) => teamFlag(c)).join(" ")
        : "—",
      step: 3,
    },
    { label: "Champion", value: `${teamFlag(s.champion)} ${teamName(s.champion)}`, step: 4 },
    { label: "Goals in final", value: String(s.finalTotalGoals ?? "—"), step: 5 },
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
          <span>{isReview ? "Review" : `Step ${step + 1} of ${total}`}</span>
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
              {reviewRows.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setStep(r.step)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02]"
                >
                  <span className="shrink-0 text-sm text-[var(--color-muted)]">{r.label}</span>
                  <span className="truncate text-right font-semibold">{r.value} ›</span>
                </button>
              ))}
            </div>
            {error && (
              <div className="mt-4 rounded-2xl bg-[var(--color-coral)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-coral)]">
                <p>{error}</p>
                {emailExists && (
                  <Link
                    href="/edit"
                    className="mt-1 inline-block underline underline-offset-4"
                  >
                    Edit your picks →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer action */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
        {!isReview ? (
          <Button
            onClick={() => setStep((x) => x + 1)}
            disabled={!steps[step].canNext}
            className="w-full"
          >
            Continue →
          </Button>
        ) : (
          <Button variant="gold" onClick={submit} disabled={pending} className="w-full text-lg">
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Submit predictions 🎉"}
          </Button>
        )}
      </div>
    </div>
  );
}

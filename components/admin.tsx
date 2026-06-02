"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui";
import {
  generateUpdatesAction,
  saveResultsAction,
  triggerRecalc,
} from "@/app/actions/admin";
import type { Results, Stage } from "@/lib/types";

export function RecalcButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await triggerRecalc();
            setMsg(r.message);
          })
        }
      >
        {pending ? "Recalculating…" : "↻ Recalculate scores"}
      </Button>
      {msg && <p className="mt-2 text-sm text-[var(--color-muted)]">{msg}</p>}
    </div>
  );
}

export function GenerateUpdatesButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="gold"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await generateUpdatesAction();
            setMsg(`Generated ${r.count} update${r.count === 1 ? "" : "s"} below.`);
          })
        }
      >
        {pending ? "Generating…" : "✨ Generate WhatsApp updates"}
      </Button>
      {msg && <p className="mt-2 text-sm text-[var(--color-muted)]">{msg}</p>}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs font-semibold hover:border-[var(--color-pitch)]"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

const STAGES: Stage[] = ["r16", "qf", "sf", "final", "champion"];

export function ResultsForm({ initial }: { initial: Results }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [champion, setChampion] = useState(initial.champion ?? "");
  const [runnerUp, setRunnerUp] = useState(initial.runnerUp ?? "");
  const [goldenBoot, setGoldenBoot] = useState(initial.goldenBoot ?? "");
  const [latam, setLatam] = useState(initial.latamFurthest ?? "");
  const [darkHorse, setDarkHorse] = useState(initial.darkHorseTeam ?? "");
  const [stages, setStages] = useState<Record<string, string>>(
    Object.fromEntries(
      STAGES.map((s) => [s, (initial.stageReached[s] ?? []).join(", ")]),
    ),
  );

  const input =
    "w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[var(--color-pitch)]";

  function save() {
    const stageReached: Partial<Record<Stage, string[]>> = {};
    for (const s of STAGES) {
      const codes = stages[s]
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      if (codes.length) stageReached[s] = codes;
    }
    const payload: Partial<Results> = {
      champion: champion.trim().toUpperCase() || null,
      runnerUp: runnerUp.trim().toUpperCase() || null,
      goldenBoot: goldenBoot.trim() || null,
      latamFurthest: latam.trim().toUpperCase() || null,
      darkHorseTeam: darkHorse.trim().toUpperCase() || null,
      stageReached,
    };
    start(async () => {
      await saveResultsAction(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold">
          Champion (code)
          <input className={input} value={champion} onChange={(e) => setChampion(e.target.value)} placeholder="ARG" />
        </label>
        <label className="text-sm font-semibold">
          Runner-up (code)
          <input className={input} value={runnerUp} onChange={(e) => setRunnerUp(e.target.value)} placeholder="FRA" />
        </label>
        <label className="text-sm font-semibold">
          LatAm furthest (code)
          <input className={input} value={latam} onChange={(e) => setLatam(e.target.value)} placeholder="BRA" />
        </label>
        <label className="text-sm font-semibold">
          Dark horse override
          <input className={input} value={darkHorse} onChange={(e) => setDarkHorse(e.target.value)} placeholder="MAR" />
        </label>
        <label className="col-span-2 text-sm font-semibold">
          Golden Boot (player id)
          <input className={`${input} normal-case`} value={goldenBoot} onChange={(e) => setGoldenBoot(e.target.value)} placeholder="messi" />
        </label>
      </div>

      <p className="pt-1 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
        Teams reaching each stage (comma-separated codes)
      </p>
      {STAGES.map((s) => (
        <label key={s} className="block text-sm font-semibold">
          <span className="uppercase">{s}</span>
          <input
            className={input}
            value={stages[s]}
            onChange={(e) => setStages((x) => ({ ...x, [s]: e.target.value }))}
            placeholder="ARG, FRA, BRA"
          />
        </label>
      ))}

      <Button onClick={save} disabled={pending} className="w-full">
        {pending ? "Saving…" : saved ? "✓ Saved & rescored" : "Save results & rescore"}
      </Button>
    </div>
  );
}

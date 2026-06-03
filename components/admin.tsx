"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui";
import {
  generateUpdatesAction,
  saveResultsAction,
  syncGroupsAction,
  triggerRecalc,
} from "@/app/actions/admin";
import { GROUP_LETTERS, type Results, type Stage } from "@/lib/types";

export function SyncGroupsButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncGroupsAction();
            setMsg(r.message);
          })
        }
      >
        {pending ? "Syncing…" : "🌐 Sync tournament (groups)"}
      </Button>
      {msg && <p className="mt-2 text-sm text-[var(--color-muted)]">{msg}</p>}
    </div>
  );
}

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
  const [groupWinners, setGroupWinners] = useState<Record<string, string>>(
    Object.fromEntries(GROUP_LETTERS.map((l) => [l, initial.groupWinners?.[l] ?? ""])),
  );
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
    const gw: Record<string, string> = {};
    for (const l of GROUP_LETTERS) {
      const code = groupWinners[l]?.trim().toUpperCase();
      if (code) gw[l] = code;
    }
    const payload: Partial<Results> = {
      champion: champion.trim().toUpperCase() || null,
      groupWinners: gw,
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
      <label className="block text-sm font-semibold">
        Champion (code)
        <input className={input} value={champion} onChange={(e) => setChampion(e.target.value)} placeholder="ARG" />
      </label>

      <p className="pt-1 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
        Group winners (rank 1 per group — usually auto-synced)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {GROUP_LETTERS.map((l) => (
          <label key={l} className="text-sm font-semibold">
            <span className="text-xs text-[var(--color-muted)]">Group {l}</span>
            <input
              className={input}
              value={groupWinners[l]}
              onChange={(e) => setGroupWinners((x) => ({ ...x, [l]: e.target.value }))}
              placeholder="—"
            />
          </label>
        ))}
      </div>

      <p className="pt-1 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
        Teams reaching each stage (comma-separated codes — sf = semifinalists)
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

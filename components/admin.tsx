"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui";
import {
  generateUpdatesAction,
  saveResultsAction,
  sendTestEmailsAction,
  setAwardsRevealed,
  syncGroupsAction,
  triggerRecalc,
} from "@/app/actions/admin";
import { GROUP_LETTERS, type Results, type Stage } from "@/lib/types";
import type { AwardsResult } from "@/lib/awards";

export function AwardsAdmin({ awards, revealed }: { awards: AwardsResult; revealed: boolean }) {
  const [pending, start] = useTransition();
  const [isLive, setIsLive] = useState(revealed);
  const [msg, setMsg] = useState<string | null>(null);
  const all = [awards.champion, ...awards.honors].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={isLive ? "outline" : "gold"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setAwardsRevealed(!isLive);
              setIsLive(!isLive);
              setMsg(r.message);
            })
          }
        >
          {pending ? "Saving…" : isLive ? "Hide honors" : "🏆 Reveal honors"}
        </Button>
        <span className="text-sm text-[var(--color-muted)]">
          {isLive ? "Live on /awards" : "Hidden — preview below"}
        </span>
      </div>
      {msg && <p className="text-sm text-[var(--color-muted)]">{msg}</p>}
      {all.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          No honors yet — they populate once results are scored.
        </p>
      ) : (
        <ul className="space-y-2">
          {all.map((a) => (
            <li key={a!.id} className="rounded-xl border border-[var(--color-line)] p-3 text-sm">
              <span className="font-bold">
                {a!.emoji} {a!.title}
              </span>{" "}
              — {a!.winners.map((w) => `${w.name} (${w.detail})`).join("; ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

/** Pull the latest knockout matchups + results from the provider right now
 * (the cron also does this daily). Friendly wording for a non-technical admin. */
export function SyncResultsButton() {
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
        {pending ? "Checking for results…" : "🔄 Pull latest results now"}
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

/** Verify email delivery by sending one of every email design to yourself —
 * no secret-in-URL needed (you're already logged into the admin). */
export function TestEmailButton() {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-pitch)]"
        />
        <Button
          variant="outline"
          disabled={pending || !email}
          onClick={() =>
            start(async () => {
              setMsg(null);
              const r = await sendTestEmailsAction(email);
              setMsg(r.message);
            })
          }
        >
          {pending ? "Sending…" : "📧 Send me a test"}
        </Button>
      </div>
      {msg && <p className="mt-2 text-sm text-[var(--color-muted)]">{msg}</p>}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs font-semibold hover:border-[var(--color-pitch)]"
    >
      {copied ? "✓ Copied" : label}
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findResumeToken } from "@/app/actions/predictions";
import { Button } from "@/components/ui";

// Email lookup → returns a member to the game (My Picks hub: their picks,
// leaderboard via the nav, and their card). The lookup also sets the
// returning-member cookie so the homepage recognizes them next time.
export function EditLookup() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await findResumeToken(email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/picks");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="The email you used"
        className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 text-lg outline-none focus:border-[var(--color-pitch)]"
      />
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? "Finding your entry…" : "Take me to my picks →"}
      </Button>
      {error && (
        <p className="rounded-2xl bg-[var(--color-coral)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-coral)]">
          {error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";
import { Button } from "./ui";

// Primary action: share the participant's personalized link so friends land on
// their bracket page (which unfurls the prediction card) and submit their own.
// Sharing a URL keeps the user gesture intact (no fetch first), so it works on
// mobile AND desktop Safari; desktop Chrome falls back to copy-to-clipboard.
export function ShareYourPicks({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const nav = navigator as Navigator;
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "La Copa de LaFamilia 2026", text, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // user dismissed
        // otherwise fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy your link:", url);
    }
  }

  return (
    <div>
      <Button onClick={share} variant="gold" className="w-full text-lg shadow-md">
        {copied ? "✓ Link copied — paste it anywhere!" : "📣 Share Your Picks"}
      </Button>
      <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
        Sends your bracket link — friends see your card and can try to beat it.
      </p>
    </div>
  );
}

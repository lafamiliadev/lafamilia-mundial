"use client";

import { useState } from "react";
import { Button } from "./ui";

// Quiet secondary action: copy the member's personalized share link (or open the
// native share sheet on mobile). Same behavior as the old "Share Your Picks"
// button — keeps the user gesture intact (no fetch first), with a clipboard
// fallback on desktop Chrome.
export function CopyShareLink({ url, text }: { url: string; text: string }) {
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
    <Button onClick={share} variant="ghost" className="w-full text-sm">
      {copied ? "✓ Link copied!" : "🔗 Copy Share Link"}
    </Button>
  );
}

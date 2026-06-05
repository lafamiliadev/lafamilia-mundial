"use client";

import { useState } from "react";
import { Button } from "./ui";

// Quiet secondary action: copy ONLY the member's personalized share link to the
// clipboard — nothing else. The rich WhatsApp message and the card image have
// their own dedicated buttons; this one does exactly what it says so "copy link"
// never silently grabs the whole share blurb. Works the same on phone + desktop.
export function CopyShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked (old browser / insecure context) — let them copy by hand.
      window.prompt("Copy your link:", url);
    }
  }

  return (
    <Button onClick={copy} variant="ghost" className="w-full text-sm">
      {copied ? "✓ Link copied!" : "🔗 Copy Share Link"}
    </Button>
  );
}

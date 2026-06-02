"use client";

import { useState } from "react";
import { Button } from "./ui";

export function ShareActions({
  resumeUrl,
  shareText,
}: {
  resumeUrl: string;
  shareText: string;
}) {
  const [copied, setCopied] = useState(false);

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${resumeUrl}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(resumeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "LaFamilia Mundial 2026", text: shareText, url: resumeUrl });
      } catch {}
    } else {
      window.open(waUrl, "_blank");
    }
  }

  return (
    <div className="space-y-3">
      <a href={waUrl} target="_blank" rel="noreferrer" className="block">
        <Button variant="gold" className="w-full">
          📲 Share on WhatsApp
        </Button>
      </a>
      <div className="flex gap-3">
        <Button variant="outline" onClick={copy} className="flex-1">
          {copied ? "✓ Copied!" : "🔗 Copy my link"}
        </Button>
        <Button variant="outline" onClick={nativeShare} className="flex-1">
          Share…
        </Button>
      </div>
    </div>
  );
}

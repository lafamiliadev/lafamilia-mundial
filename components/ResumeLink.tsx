"use client";

import { useState } from "react";

// The private return-link section — kept available lower on the results page for
// users who need to come back and edit. No longer a primary CTA.
export function ResumeLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl bg-[var(--color-gold-soft)]/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">🔖 Your private link to edit later</p>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
          className="shrink-0 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold hover:border-[var(--color-pitch)]"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1 break-all font-mono text-xs text-[var(--color-pitch)]">{url}</p>
    </div>
  );
}

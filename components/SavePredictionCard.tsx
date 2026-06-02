"use client";

import { useState } from "react";
import { Button } from "./ui";

// The headline share action.
// - Touch devices (phones/tablets): open the native share sheet with the PNG
//   attached → straight to WhatsApp / Instagram Stories / LinkedIn.
// - Desktop: download the PNG so it can be dropped into any chat or post.
// Download is the reliable default; share is only attempted where it actually
// works, and any share failure falls back to a download.

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function SavePredictionCard({
  cardUrl,
  fileName,
  shareText,
  shareUrl,
  secondary = false,
}: {
  cardUrl: string;
  fileName: string;
  shareText: string;
  shareUrl: string;
  /** Render as a quiet secondary action (download is no longer the headline). */
  secondary?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "saved" | "shared">("");

  async function handle() {
    setBusy(true);
    setDone("");
    try {
      const res = await fetch(cardUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`card ${res.status}`);
      const blob = await res.blob();

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      // Only use Web Share on touch devices — on desktop it loses the user
      // gesture after the fetch and silently fails.
      const isTouch =
        typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches === true;

      if (isTouch && nav.share && nav.canShare) {
        const file = new File([blob], fileName, { type: "image/png" });
        if (nav.canShare({ files: [file] })) {
          try {
            await nav.share({
              files: [file],
              text: `${shareText}\n\n${shareUrl}`,
              title: "La Copa de LaFamilia 2026",
            });
            setDone("shared");
            return;
          } catch (err) {
            // User cancelled → stop quietly. Otherwise fall through to download.
            if ((err as Error)?.name === "AbortError") {
              setDone("");
              return;
            }
          }
        }
      }

      // Desktop + fallback: download the PNG.
      downloadBlob(blob, fileName);
      setDone("saved");
    } catch {
      // Last resort: open the image so it can be long-pressed / right-clicked.
      window.open(cardUrl, "_blank", "noopener");
    } finally {
      setBusy(false);
      setTimeout(() => setDone(""), 2500);
    }
  }

  const label = busy
    ? "Creating your card…"
    : done === "shared"
      ? "✓ Shared!"
      : done === "saved"
        ? "✓ Saved!"
        : "📸 Save card image";

  if (secondary) {
    return (
      <Button onClick={handle} disabled={busy} variant="ghost" className="w-full text-sm">
        {label}
      </Button>
    );
  }

  return (
    <div>
      <Button onClick={handle} disabled={busy} variant="gold" className="w-full text-lg shadow-md">
        {busy ? label : done ? label : "📸 Save Prediction Card"}
      </Button>
      <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
        Saves your branded card image — share it to WhatsApp, Stories, or LinkedIn.
      </p>
    </div>
  );
}

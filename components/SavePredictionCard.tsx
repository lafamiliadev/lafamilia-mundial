"use client";

import { useState } from "react";
import { Button } from "./ui";

// The headline share action. On mobile it opens the native share sheet with the
// PNG attached (→ WhatsApp / Instagram Stories / LinkedIn with the image). On
// desktop it downloads the PNG so it can be dropped into any chat or post.

export function SavePredictionCard({
  cardUrl,
  fileName,
  shareText,
  shareUrl,
}: {
  cardUrl: string;
  fileName: string;
  shareText: string;
  shareUrl: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "saved" | "shared">("");

  async function handle() {
    setBusy(true);
    setDone("");
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      // Mobile: native share sheet with the image attached.
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          text: `${shareText}\n\n${shareUrl}`,
          title: "LaFamilia Mundial 2026",
        });
        setDone("shared");
        return;
      }

      // Desktop: download the PNG.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone("saved");
    } catch {
      // Last resort: open the image in a new tab to long-press / right-click save.
      window.open(cardUrl, "_blank");
    } finally {
      setBusy(false);
      setTimeout(() => setDone(""), 2500);
    }
  }

  return (
    <div>
      <Button onClick={handle} disabled={busy} variant="gold" className="w-full text-lg shadow-md">
        {busy
          ? "Creating your card…"
          : done === "shared"
            ? "✓ Shared!"
            : done === "saved"
              ? "✓ Saved! Now share it 🎉"
              : "📸 Save Prediction Card"}
      </Button>
      <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
        Saves your branded card image — share it to WhatsApp, Stories, or LinkedIn.
      </p>
    </div>
  );
}

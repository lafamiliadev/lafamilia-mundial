import { ImageResponse } from "next/og";

// Branded preview image shown when the public link is shared (WhatsApp, iMessage,
// social). Replaces the default/empty preview so the link looks like La Copa.
export const runtime = "nodejs";
export const alt = "La Copa de LaFamilia 2026 — the World Cup prediction game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(150deg, #0e7a41 0%, #0a4a28 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "60px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 150, lineHeight: 1 }}>🏆</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 78, fontWeight: 800, letterSpacing: -1 }}>
          La Copa de LaFamilia
        </div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 42, fontWeight: 700, color: "#F4C430" }}>
          World Cup 2026 ⚽🌎
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 34, color: "rgba(255,255,255,0.85)" }}>
          Predict. Compete. Brag forever.
        </div>
      </div>
    ),
    size,
  );
}

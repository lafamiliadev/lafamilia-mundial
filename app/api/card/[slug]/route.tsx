import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { teamFlag, teamName } from "@/lib/teams";
import { playerName } from "@/lib/players";

export const runtime = "nodejs";

// "La Copa de LaFamilia 2026" share card — 1080×1350 portrait, built to be SAVED
// + shared (WhatsApp, IG Stories, LinkedIn). Keyed by the PUBLIC slug (never the
// private resume token). Festive palette, clean hierarchy: champion pick focal,
// supporting picks quiet, on a calm white panel framed by the vibrant gradient.

const NAVY = "#0a2342";
const INK = "#0a2342";
const GOLD = "#e8920c";
const TEAL = "#0e8d80";
const MUTED = "#7c8aa0";

async function logo(file: string): Promise<string | null> {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", file), "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return null;
  }
}

function Support({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", textAlign: "center", gap: "4px" }}>
      <div style={{ display: "flex", fontSize: "24px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "1px" }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: "36px", fontWeight: 800, color: INK }}>{value}</div>
    </div>
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const repo = await db();
  const me = await repo.getBySlug(slug);
  const [white] = await Promise.all([logo("lafamilia-logo-white.svg")]);

  const name = me?.name ?? "A LaFamilia member";
  const firstName = name.split(" ")[0];
  const p = me?.predictions;

  const champ = p ? `${teamFlag(p.champion)} ${teamName(p.champion)}` : "—";
  const rooting = me?.rootingCountry ? `${teamFlag(me.rootingCountry)} ${teamName(me.rootingCountry)}` : "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(155deg, #ff2d6f 0%, #ff6b1a 50%, #ffb627 100%)",
          fontFamily: "sans-serif",
          padding: "76px 64px",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", bottom: "-90px", right: "-90px", fontSize: "360px", opacity: 0.1 }}>⚽</div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          {white ? (
            <img src={white} width={260} height={104} style={{ objectFit: "contain" }} alt="LaFamilia" />
          ) : (
            <div style={{ display: "flex", fontSize: "56px", fontWeight: 800, color: "#fff" }}>LaFamilia</div>
          )}
          <div style={{ display: "flex", fontSize: "46px", fontWeight: 800, color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
            La Copa de LaFamilia 2026
          </div>
          <div style={{ display: "flex", fontSize: "27px", fontWeight: 700, color: "#fff3d6", letterSpacing: "1px" }}>
            PREDICT · COMPETE · BRAG FOREVER
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            background: "#ffffff",
            borderRadius: "44px",
            padding: "56px",
            boxShadow: "0 30px 60px rgba(10,35,66,0.3)",
          }}
        >
          <div style={{ display: "flex", fontSize: "28px", fontWeight: 800, color: MUTED, letterSpacing: "2px" }}>
            {firstName.toUpperCase()}&apos;S BRACKET
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: "34px", gap: "2px" }}>
            <div style={{ display: "flex", fontSize: "30px", fontWeight: 800, color: GOLD, letterSpacing: "1px" }}>
              🏆 PREDICTING TO WIN
            </div>
            <div style={{ display: "flex", fontSize: "104px", fontWeight: 800, color: INK, lineHeight: 1.05 }}>
              {champ}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "26px" }}>
            <div style={{ display: "flex", fontSize: "30px", fontWeight: 700, color: TEAL }}>🌎 Rooting for</div>
            <div style={{ display: "flex", fontSize: "40px", fontWeight: 800, color: INK }}>{rooting}</div>
          </div>

          <div style={{ display: "flex", height: "2px", background: "#ecf0f5", margin: "40px 0 36px" }} />

          <div style={{ display: "flex", gap: "20px" }}>
            <Support label="Runner-up" value={p ? `${teamFlag(p.runnerUp)} ${teamName(p.runnerUp)}` : "—"} />
            <Support label="Golden Boot" value={p ? playerName(p.goldenBoot) : "—"} />
            <Support label="Dark horse" value={p ? `${teamFlag(p.darkHorse)} ${teamName(p.darkHorse)}` : "—"} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: "54px", fontWeight: 800, color: "#ffffff", textShadow: "0 2px 10px rgba(0,0,0,0.22)" }}>
            Can your bracket beat mine? ⚽
          </div>
          <div style={{ display: "flex", fontSize: "24px", color: "#fff4dd", fontWeight: 600, opacity: 0.95 }}>
            🌱 Siembra — planting seeds for the next generation of Latine founders
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, emoji: "twemoji" },
  );
}

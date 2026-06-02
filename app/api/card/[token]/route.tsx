import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { teamFlag, teamName } from "@/lib/teams";
import { playerName } from "@/lib/players";

export const runtime = "nodejs";

// "La Copa de LaFamilia 2026" collectible card — 1080×1350 portrait, built to be
// SAVED + shared (WhatsApp, IG Stories, LinkedIn, group chats). Sticker-pack /
// tournament-poster energy: vibrant fiesta palette, the LaFamilia logo for
// attribution, the colors for the emotion. It headlines two DIFFERENT things:
// who you're ROOTING FOR vs who you're PREDICTING TO WIN.

const NAVY = "#051d40";
const GOLD = "#ffc83d";
const CORAL = "#ff5a5f";
const TEAL = "#13b6a6";
const MAGENTA = "#ff2d6f";

const BUNTING = ["#ff2d6f", "#ffc83d", "#13b6a6", "#ff7a1a", "#7c3aed", "#ff2d6f", "#ffc83d", "#13b6a6", "#ff7a1a", "#7c3aed"];
const CONFETTI = [
  { left: "8%", top: "20%", c: GOLD, r: "18deg" },
  { left: "86%", top: "16%", c: TEAL, r: "-12deg" },
  { left: "16%", top: "54%", c: CORAL, r: "24deg" },
  { left: "90%", top: "60%", c: MAGENTA, r: "-20deg" },
  { left: "78%", top: "82%", c: GOLD, r: "12deg" },
  { left: "10%", top: "86%", c: TEAL, r: "-16deg" },
];

async function navyLogo(): Promise<string | null> {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", "lafamilia-logo.svg"), "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return null;
  }
}
async function whiteLogo(): Promise<string | null> {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", "lafamilia-logo-white.svg"), "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return null;
  }
}

function Sticker({
  emoji,
  label,
  value,
  border,
  rotate,
}: {
  emoji: string;
  label: string;
  value: string;
  border: string;
  rotate: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: "#ffffff",
        border: `7px solid ${border}`,
        borderRadius: "28px",
        padding: "24px 28px",
        transform: `rotate(${rotate})`,
        boxShadow: "0 14px 30px rgba(5,29,64,0.22)",
      }}
    >
      <div style={{ display: "flex", fontSize: "27px", fontWeight: 800, color: border, textTransform: "uppercase", letterSpacing: "1px" }}>
        {emoji} {label}
      </div>
      <div style={{ display: "flex", fontSize: "58px", fontWeight: 800, color: NAVY, marginTop: "4px" }}>
        {value}
      </div>
    </div>
  );
}

function Chip({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: "rgba(255,255,255,0.94)",
        borderRadius: "22px",
        padding: "18px 20px",
        boxShadow: "0 8px 18px rgba(5,29,64,0.16)",
      }}
    >
      <div style={{ display: "flex", fontSize: "21px", fontWeight: 700, color: "#8a7a55" }}>
        {emoji} {label}
      </div>
      <div style={{ display: "flex", fontSize: "32px", fontWeight: 800, color: NAVY, marginTop: "2px" }}>
        {value}
      </div>
    </div>
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const repo = await db();
  const me = await repo.getByToken(token);
  const [navy, white] = await Promise.all([navyLogo(), whiteLogo()]);

  const name = me?.name ?? "A LaFamilia member";
  const firstName = name.split(" ")[0];
  const p = me?.predictions;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "linear-gradient(150deg, #ff2d6f 0%, #ff6b1a 48%, #ffc83d 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Watermark fútbol + globe */}
        <div style={{ position: "absolute", top: "120px", right: "-70px", fontSize: "260px", opacity: 0.1 }}>⚽</div>
        <div style={{ position: "absolute", bottom: "60px", left: "-70px", fontSize: "240px", opacity: 0.1 }}>🌎</div>
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.left,
              top: c.top,
              width: "26px",
              height: "26px",
              borderRadius: "7px",
              background: c.c,
              transform: `rotate(${c.r})`,
              opacity: 0.9,
            }}
          />
        ))}

        {/* Papel-picado bunting */}
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", padding: "0 30px" }}>
          {BUNTING.map((c, i) => (
            <div
              key={i}
              style={{
                width: "92px",
                height: "70px",
                background: c,
                borderBottomLeftRadius: "46px",
                borderBottomRightRadius: "46px",
                boxShadow: "0 6px 10px rgba(0,0,0,0.12)",
              }}
            />
          ))}
        </div>

        {/* Logo in a clean chip + title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "30px", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              background: "#ffffff",
              borderRadius: "26px",
              padding: "20px 40px",
              boxShadow: "0 12px 26px rgba(5,29,64,0.25)",
            }}
          >
            {navy ? (
              <img src={navy} width={300} height={120} style={{ objectFit: "contain" }} alt="LaFamilia" />
            ) : (
              <div style={{ display: "flex", fontSize: "60px", fontWeight: 800, color: NAVY }}>LaFamilia</div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: "62px", fontWeight: 800, color: "#ffffff", textShadow: "0 3px 10px rgba(0,0,0,0.25)" }}>
            La Copa de LaFamilia 2026 ⚽
          </div>
          <div style={{ display: "flex", fontSize: "30px", fontWeight: 700, color: "#fff3d6" }}>
            Predict. Compete. Brag forever.
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: "34px 56px 0", flex: 1 }}>
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 800, color: "#ffffff", textShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
            {firstName}&apos;s bracket
          </div>

          {/* The two headline picks — rooting vs predicting to win */}
          <div style={{ display: "flex", gap: "26px", marginTop: "20px" }}>
            <Sticker
              emoji="🌎"
              label="Rooting for"
              value={me?.rootingCountry ? `${teamFlag(me.rootingCountry)} ${teamName(me.rootingCountry)}` : "—"}
              border={TEAL}
              rotate="-3deg"
            />
            <Sticker
              emoji="🏆"
              label="Predicting to win"
              value={p ? `${teamFlag(p.champion)} ${teamName(p.champion)}` : "—"}
              border={GOLD}
              rotate="3deg"
            />
          </div>

          {/* Supporting picks */}
          <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
            <Chip emoji="🥈" label="Runner-up" value={p ? `${teamFlag(p.runnerUp)} ${teamName(p.runnerUp)}` : "—"} />
            <Chip emoji="🥅" label="Golden Boot" value={p ? playerName(p.goldenBoot) : "—"} />
            <Chip emoji="🔥" label="Dark horse" value={p ? `${teamFlag(p.darkHorse)} ${teamName(p.darkHorse)}` : "—"} />
          </div>

          {/* Callout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "40px",
              background: NAVY,
              color: "#ffffff",
              fontSize: "50px",
              fontWeight: 800,
              padding: "28px",
              borderRadius: "26px",
              boxShadow: "0 14px 30px rgba(5,29,64,0.3)",
            }}
          >
            Can your bracket beat mine? ⚽
          </div>
        </div>

        {/* Footer — subtle wordmark + Siembra */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", paddingBottom: "40px", paddingTop: "6px" }}>
          {white && <img src={white} width={170} height={68} style={{ objectFit: "contain", opacity: 0.96 }} alt="LaFamilia" />}
          <div style={{ display: "flex", fontSize: "23px", color: "#ffffff", fontWeight: 600, opacity: 0.95 }}>
            🌱 Siembra — planting seeds for the next generation of Latine founders
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, emoji: "twemoji" },
  );
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { cardTheme, darken, withAlpha } from "@/lib/card-theme";
import { teamFlag, teamName } from "@/lib/teams";

export const runtime = "nodejs";

// La Copa de LaFamilia 2026 — the COLLECTIBLE prediction card. Fully dynamic per
// member: their actual picks, a personalized title, and a "team edition" palette
// that shifts to their CHAMPION's flag identity (Brazil → green, Argentina →
// blue, …). Premium emerald/ivory/gold-foil structure kept across the series.

const CREAM = "#f5edda";
const SAND = "#cdbb90";
const GOLD = "#c8a24a";
const GOLD_LT = "#e6cd82";

async function asset(file: string): Promise<string | null> {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", file), "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const repo = await db();
  const [me, logo] = await Promise.all([
    repo.getBySlug(slug),
    asset("lafamilia-logo-gold.svg"),
  ]);

  const name = me?.name ?? "A LaFamilia Member";
  const p = me?.predictions;

  const championCode = p?.champion ?? null;
  const champName = (championCode ? teamName(championCode) : "—").toUpperCase();
  const theme = cardTheme(championCode);

  // Name + flag share one line, so size for the combined width. The team name
  // is the dominant element; the flag scales to sit just under its cap height.
  const len = champName.length;
  const heroSize =
    len <= 7 ? 150 : len <= 10 ? 124 : len <= 13 ? 94 : len <= 16 ? 74 : 60;
  const flagSize = Math.round(heroSize * 0.72);

  // The Final Four (prestige share artifact) + group-winner flag strip.
  const finalFour = (p?.semifinalists ?? []).slice(0, 4);
  const winnerFlags = Object.keys(p?.groupWinners ?? {})
    .sort()
    .map((l) => (p?.groupWinners ?? {})[l])
    .filter(Boolean);
  const rooting = me?.rootingCountry ?? null;
  const finalGoals = p?.finalTotalGoals ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
          background: `radial-gradient(125% 75% at 50% 0%, ${theme.base} 0%, ${darken(theme.base, 0.55)} 82%)`,
        }}
      >
        {/* Team-colored stadium glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "560px",
            background: `radial-gradient(60% 100% at 50% 0%, ${withAlpha(theme.accent, 0.22)} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />

        {/* Gold foil double frame */}
        <div style={{ position: "absolute", top: "30px", left: "30px", right: "30px", bottom: "30px", border: `3px solid ${GOLD}`, borderRadius: "30px" }} />
        <div style={{ position: "absolute", top: "40px", left: "40px", right: "40px", bottom: "40px", border: `1px solid ${withAlpha(GOLD_LT, 0.45)}`, borderRadius: "22px" }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "66px 68px" }}>
          {/* ── Header ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {logo ? (
                <img src={logo} width={216} height={108} style={{ objectFit: "contain" }} alt="LaFamilia" />
              ) : (
                <div style={{ display: "flex", fontSize: "52px", fontWeight: 800, color: GOLD }}>LaFamilia</div>
              )}
            </div>
            <div style={{ display: "flex", fontSize: "22px", fontWeight: 700, color: SAND, letterSpacing: "6px" }}>
              LA COPA DE LAFAMILIA · WORLD CUP 2026
            </div>
            <div style={{ display: "flex", fontSize: "38px", fontWeight: 800, color: CREAM, letterSpacing: "1px" }}>
              {name}&apos;s predictions
            </div>
            {rooting && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: 700, color: SAND }}>
                <span style={{ display: "flex" }}>Rooting for {teamFlag(rooting)}</span>
                <span style={{ display: "flex" }}>{teamName(rooting)}</span>
              </div>
            )}
            <div style={{ display: "flex", height: "2px", marginTop: "4px", background: `linear-gradient(90deg, ${theme.accent} 0%, rgba(0,0,0,0) 100%)` }} />
          </div>

          {/* ── Champion hero — flag + name on one line, name dominant ── */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <div style={{ display: "flex", fontSize: "25px", fontWeight: 800, color: theme.accent, letterSpacing: "6px", marginBottom: "18px" }}>
              🏆 MY CHAMPION PICK
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
              <span style={{ display: "flex", fontSize: `${flagSize}px`, lineHeight: 1 }}>{teamFlag(championCode)}</span>
              <span style={{ display: "flex", fontSize: `${heroSize}px`, fontWeight: 900, color: CREAM, letterSpacing: "1px", lineHeight: 1 }}>
                {champName}
              </span>
            </div>
          </div>

          {/* ── Final Four — medium weight: smaller than the champion ── */}
          <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${withAlpha(SAND, 0.35)}`, paddingTop: "46px" }}>
            <span style={{ display: "flex", fontSize: "21px", fontWeight: 800, color: GOLD, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "20px" }}>
              Final Four
            </span>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {finalFour.map((code) => (
                <div key={code} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "224px", gap: "12px" }}>
                  <span style={{ display: "flex", fontSize: "74px", lineHeight: 1 }}>{teamFlag(code)}</span>
                  <span style={{ display: "flex", fontSize: "26px", fontWeight: 800, color: CREAM, textAlign: "center" }}>{teamName(code)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Group winners — lightest weight: a clean flag strip, no box ── */}
          <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${withAlpha(SAND, 0.35)}`, paddingTop: "40px", marginTop: "42px" }}>
            <span style={{ display: "flex", fontSize: "21px", fontWeight: 800, color: GOLD, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "16px" }}>
              Group Winners
            </span>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {winnerFlags.map((code, i) => (
                <span key={i} style={{ display: "flex", justifyContent: "center", fontSize: "50px", width: "78px" }}>{teamFlag(code)}</span>
              ))}
            </div>
          </div>

          {/* ── Tiebreaker: goals in the final — a small, collectible stat ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${withAlpha(SAND, 0.35)}`, paddingTop: "30px", marginTop: "34px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ display: "flex", fontSize: "21px", fontWeight: 800, color: GOLD, letterSpacing: "4px", textTransform: "uppercase" }}>
                Goals in the Final
              </span>
              <span style={{ display: "flex", fontSize: "16px", color: SAND, marginTop: "6px" }}>
                My tiebreaker guess
              </span>
            </div>
            <span style={{ display: "flex", fontSize: "62px", fontWeight: 900, color: CREAM, lineHeight: 1 }}>
              {finalGoals ?? "—"}
            </span>
          </div>

          {/* Modest breathing room before the supporting invite. */}
          <div style={{ display: "flex", flex: 0.2 }} />

          {/* ── Challenge — supporting, left-aligned, compact ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "15px", marginTop: "30px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
              <div style={{ display: "flex", fontSize: "33px", fontWeight: 800, color: CREAM, lineHeight: 1 }}>
                Can you beat my bracket?
              </div>
              <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${GOLD}`, borderRadius: "999px", padding: "11px 26px", fontSize: "22px", fontWeight: 800, color: GOLD_LT, letterSpacing: "0.5px" }}>
                Make your picks ⚽
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "19px", fontWeight: 700 }}>
              <span style={{ display: "flex", color: SAND }}>Built by LaFamilia ·</span>
              <span style={{ display: "flex", color: GOLD_LT }}>join the familia → nas.io/lafamilia-foundation</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      emoji: "twemoji",
      headers: {
        // Cache at the CDN so link-preview crawlers (WhatsApp/Facebook) hit a
        // warm copy instead of a ~1.5s cold Satori render that can exceed their
        // fetch budget and drop the image. s-maxage keeps the CDN copy for an
        // hour; stale-while-revalidate serves instantly while refreshing. Picks
        // can change until lock, so this is a deliberate freshness/reliability
        // trade-off (a fresh share may show a ≤1h-old card after an edit).
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

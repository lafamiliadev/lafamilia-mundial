// Per-champion "team edition" palettes for the collectible card. Each card keeps
// the same premium structure + gold foil frame (so the set feels like one series),
// but the base color shifts to the champion's flag identity: Brazil → green,
// Argentina → blue, Colombia → blue/gold, etc. `accent` is the bright flag
// highlight used for the eyebrow, divider, flag glow and "SCAN TO PLAY".

export type CardTheme = { base: string; accent: string };

const DEFAULT: CardTheme = { base: "#0b3a2c", accent: "#c8a24a" };

const THEMES: Record<string, CardTheme> = {
  // CONMEBOL
  ARG: { base: "#0c2c54", accent: "#74acdf" },
  BRA: { base: "#08361c", accent: "#ffd200" },
  URU: { base: "#0b2c54", accent: "#ffd200" },
  COL: { base: "#122a55", accent: "#ffd400" },
  ECU: { base: "#103a22", accent: "#ffd200" },
  PAR: { base: "#0b2c54", accent: "#e23b3b" },
  PER: { base: "#4a0e14", accent: "#ff6b6b" },
  CHI: { base: "#0b2046", accent: "#e23b3b" },
  BOL: { base: "#0a3b22", accent: "#ffd200" },
  VEN: { base: "#0c2c54", accent: "#ffd200" },
  // CONCACAF
  USA: { base: "#0a1733", accent: "#e2495f" },
  CAN: { base: "#4a0e12", accent: "#ff6b6b" },
  MEX: { base: "#0a3b22", accent: "#e23b3b" },
  CRC: { base: "#0b2046", accent: "#e23b3b" },
  PAN: { base: "#0c2c54", accent: "#e2495f" },
  HON: { base: "#0b2c54", accent: "#6ea8ff" },
  GUA: { base: "#0b2c54", accent: "#6ea8ff" },
  SLV: { base: "#0b2c54", accent: "#6ea8ff" },
  NCA: { base: "#0b2c54", accent: "#6ea8ff" },
  DOM: { base: "#0b2046", accent: "#e2495f" },
  // UEFA
  FRA: { base: "#0b1c44", accent: "#5b8def" },
  ENG: { base: "#1b2533", accent: "#e2495f" },
  ESP: { base: "#5a1410", accent: "#f1bf00" },
  POR: { base: "#0b3b2a", accent: "#e2495f" },
  GER: { base: "#1c1c1c", accent: "#e0b021" },
  NED: { base: "#16213a", accent: "#ff8c3a" },
  ITA: { base: "#0b3b2a", accent: "#5b8def" },
  BEL: { base: "#1a160f", accent: "#f5d000" },
  CRO: { base: "#14224a", accent: "#e2495f" },
  SUI: { base: "#4a0e12", accent: "#f4f4f4" },
  DEN: { base: "#4a0e12", accent: "#f4f4f4" },
  AUT: { base: "#4a0e12", accent: "#f4f4f4" },
  POL: { base: "#4a0e12", accent: "#f4f4f4" },
  SRB: { base: "#14224a", accent: "#e2495f" },
  TUR: { base: "#4a0e12", accent: "#f4f4f4" },
  NOR: { base: "#0b1c44", accent: "#e2495f" },
  // AFC
  JPN: { base: "#3a0c14", accent: "#ff5a6e" },
  KOR: { base: "#16213a", accent: "#e2495f" },
  IRN: { base: "#0a3b22", accent: "#e2495f" },
  AUS: { base: "#0a1733", accent: "#ffcd00" },
  KSA: { base: "#08361c", accent: "#f4f4f4" },
  QAT: { base: "#4a0e2a", accent: "#d36a8c" },
  // CAF
  MAR: { base: "#4a0f12", accent: "#2fbf71" },
  SEN: { base: "#0a3b22", accent: "#ffd200" },
  NGA: { base: "#0a3b22", accent: "#7fe0a3" },
  EGY: { base: "#4a0e12", accent: "#f4f4f4" },
  ALG: { base: "#0a3b22", accent: "#e2495f" },
  CIV: { base: "#143a22", accent: "#ff8c3a" },
  TUN: { base: "#4a0e12", accent: "#f4f4f4" },
  GHA: { base: "#0a3b22", accent: "#ffd200" },
  // OFC
  NZL: { base: "#0a1733", accent: "#e2495f" },
};

export function cardTheme(code: string | null | undefined): CardTheme {
  return (code && THEMES[code]) || DEFAULT;
}

/** Darken a hex toward black by factor f (0..1) — for the gradient floor. */
export function darken(hex: string, f: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Hex → rgba string for soft glows. */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

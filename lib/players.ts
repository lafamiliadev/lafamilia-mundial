// Curated player pools for the Bonus Picks. Kept small + recognizable so the
// mobile flow stays fast; each list is searchable. Names are illustrative
// star-power shortlists (final squads are confirmed closer to the tournament).

export type Position = "FW" | "MF" | "DF" | "GK";

export type Player = {
  id: string;
  name: string;
  teamCode: string;
  pos: Position;
  /** Featured = shown by default; the rest appear via "see all". */
  featured?: boolean;
};

// ── Forwards / strikers — the Golden Boot (top scorer) shortlist. The
// `featured` ones are shown by default; the rest appear via search. ──
export const STRIKERS: Player[] = [
  { id: "messi", name: "Lionel Messi", teamCode: "ARG", pos: "FW", featured: true },
  { id: "julian-alvarez", name: "Julián Álvarez", teamCode: "ARG", pos: "FW", featured: true },
  { id: "lautaro", name: "Lautaro Martínez", teamCode: "ARG", pos: "FW", featured: true },
  { id: "vinicius", name: "Vinícius Júnior", teamCode: "BRA", pos: "FW", featured: true },
  { id: "rodrygo", name: "Rodrygo", teamCode: "BRA", pos: "FW" },
  { id: "raphinha", name: "Raphinha", teamCode: "BRA", pos: "FW", featured: true },
  { id: "endrick", name: "Endrick", teamCode: "BRA", pos: "FW" },
  { id: "mbappe", name: "Kylian Mbappé", teamCode: "FRA", pos: "FW", featured: true },
  { id: "dembele", name: "Ousmane Dembélé", teamCode: "FRA", pos: "FW" },
  { id: "kane", name: "Harry Kane", teamCode: "ENG", pos: "FW", featured: true },
  { id: "saka", name: "Bukayo Saka", teamCode: "ENG", pos: "FW" },
  { id: "foden", name: "Phil Foden", teamCode: "ENG", pos: "FW" },
  { id: "yamal", name: "Lamine Yamal", teamCode: "ESP", pos: "FW", featured: true },
  { id: "morata", name: "Álvaro Morata", teamCode: "ESP", pos: "FW" },
  { id: "olmo", name: "Dani Olmo", teamCode: "ESP", pos: "FW" },
  { id: "ronaldo", name: "Cristiano Ronaldo", teamCode: "POR", pos: "FW", featured: true },
  { id: "leao", name: "Rafael Leão", teamCode: "POR", pos: "FW" },
  { id: "havertz", name: "Kai Havertz", teamCode: "GER", pos: "FW" },
  { id: "depay", name: "Memphis Depay", teamCode: "NED", pos: "FW" },
  { id: "gakpo", name: "Cody Gakpo", teamCode: "NED", pos: "FW" },
  { id: "lukaku", name: "Romelu Lukaku", teamCode: "BEL", pos: "FW" },
  { id: "haaland", name: "Erling Haaland", teamCode: "NOR", pos: "FW", featured: true },
  { id: "salah", name: "Mohamed Salah", teamCode: "EGY", pos: "FW", featured: true },
  { id: "en-nesyri", name: "Youssef En-Nesyri", teamCode: "MAR", pos: "FW" },
  { id: "nunez", name: "Darwin Núñez", teamCode: "URU", pos: "FW", featured: true },
  { id: "luis-diaz", name: "Luis Díaz", teamCode: "COL", pos: "FW", featured: true },
  { id: "james", name: "James Rodríguez", teamCode: "COL", pos: "FW" },
  { id: "raul-jimenez", name: "Raúl Jiménez", teamCode: "MEX", pos: "FW" },
  { id: "pulisic", name: "Christian Pulisic", teamCode: "USA", pos: "FW", featured: true },
  { id: "balogun", name: "Folarin Balogun", teamCode: "USA", pos: "FW" },
  { id: "kudus", name: "Mohammed Kudus", teamCode: "GHA", pos: "FW" },
  { id: "mitoma", name: "Kaoru Mitoma", teamCode: "JPN", pos: "FW" },
  { id: "son", name: "Son Heung-min", teamCode: "KOR", pos: "FW", featured: true },
];

// ── Midfielders (for Golden Ball). ──
export const MIDFIELDERS: Player[] = [
  { id: "bellingham", name: "Jude Bellingham", teamCode: "ENG", pos: "MF" },
  { id: "rodri", name: "Rodri", teamCode: "ESP", pos: "MF" },
  { id: "pedri", name: "Pedri", teamCode: "ESP", pos: "MF" },
  { id: "debruyne", name: "Kevin De Bruyne", teamCode: "BEL", pos: "MF" },
  { id: "wirtz", name: "Florian Wirtz", teamCode: "GER", pos: "MF" },
  { id: "musiala", name: "Jamal Musiala", teamCode: "GER", pos: "MF" },
  { id: "b-fernandes", name: "Bruno Fernandes", teamCode: "POR", pos: "MF" },
  { id: "valverde", name: "Federico Valverde", teamCode: "URU", pos: "MF" },
  { id: "mac-allister", name: "Alexis Mac Allister", teamCode: "ARG", pos: "MF" },
  { id: "enzo", name: "Enzo Fernández", teamCode: "ARG", pos: "MF" },
  { id: "de-jong", name: "Frenkie de Jong", teamCode: "NED", pos: "MF" },
  { id: "tchouameni", name: "Aurélien Tchouaméni", teamCode: "FRA", pos: "MF" },
  { id: "modric", name: "Luka Modrić", teamCode: "CRO", pos: "MF" },
];

// ── Defenders (for Golden Ball). ──
export const DEFENDERS: Player[] = [
  { id: "van-dijk", name: "Virgil van Dijk", teamCode: "NED", pos: "DF" },
  { id: "saliba", name: "William Saliba", teamCode: "FRA", pos: "DF" },
  { id: "hakimi", name: "Achraf Hakimi", teamCode: "MAR", pos: "DF" },
  { id: "ruben-dias", name: "Rúben Dias", teamCode: "POR", pos: "DF" },
  { id: "marquinhos", name: "Marquinhos", teamCode: "BRA", pos: "DF" },
  { id: "romero", name: "Cristian Romero", teamCode: "ARG", pos: "DF" },
  { id: "theo", name: "Theo Hernández", teamCode: "FRA", pos: "DF" },
];

// ── Goalkeepers — featured 20 (Golden Glove) + the rest for "see all". ──
export const GOALKEEPERS: Player[] = [
  { id: "e-martinez", name: "Emiliano Martínez", teamCode: "ARG", pos: "GK", featured: true },
  { id: "alisson", name: "Alisson", teamCode: "BRA", pos: "GK", featured: true },
  { id: "maignan", name: "Mike Maignan", teamCode: "FRA", pos: "GK", featured: true },
  { id: "pickford", name: "Jordan Pickford", teamCode: "ENG", pos: "GK", featured: true },
  { id: "diogo-costa", name: "Diogo Costa", teamCode: "POR", pos: "GK", featured: true },
  { id: "unai-simon", name: "Unai Simón", teamCode: "ESP", pos: "GK", featured: true },
  { id: "neuer", name: "Manuel Neuer", teamCode: "GER", pos: "GK", featured: true },
  { id: "courtois", name: "Thibaut Courtois", teamCode: "BEL", pos: "GK", featured: true },
  { id: "verbruggen", name: "Bart Verbruggen", teamCode: "NED", pos: "GK", featured: true },
  { id: "bounou", name: "Yassine Bounou", teamCode: "MAR", pos: "GK", featured: true },
  { id: "livakovic", name: "Dominik Livaković", teamCode: "CRO", pos: "GK", featured: true },
  { id: "kobel", name: "Gregor Kobel", teamCode: "SUI", pos: "GK", featured: true },
  { id: "rochet", name: "Sergio Rochet", teamCode: "URU", pos: "GK", featured: true },
  { id: "c-vargas", name: "Camilo Vargas", teamCode: "COL", pos: "GK", featured: true },
  { id: "suzuki", name: "Zion Suzuki", teamCode: "JPN", pos: "GK", featured: true },
  { id: "e-mendy", name: "Édouard Mendy", teamCode: "SEN", pos: "GK", featured: true },
  { id: "galindez", name: "Hernán Galíndez", teamCode: "ECU", pos: "GK", featured: true },
  { id: "turner", name: "Matt Turner", teamCode: "USA", pos: "GK", featured: true },
  { id: "ochoa", name: "Guillermo Ochoa", teamCode: "MEX", pos: "GK", featured: true },
  { id: "nyland", name: "Ørjan Nyland", teamCode: "NOR", pos: "GK", featured: true },
  // "See all" pool — one more keeper for the remaining nations.
  { id: "ryan", name: "Mathew Ryan", teamCode: "AUS", pos: "GK" },
  { id: "kim-seung-gyu", name: "Kim Seung-gyu", teamCode: "KOR", pos: "GK" },
  { id: "schlager", name: "Alexander Schlager", teamCode: "AUT", pos: "GK" },
  { id: "olsen", name: "Robin Olsen", teamCode: "SWE", pos: "GK" },
  { id: "el-shenawy", name: "Mohamed El-Shenawy", teamCode: "EGY", pos: "GK" },
  { id: "ati-zigi", name: "Lawrence Ati-Zigi", teamCode: "GHA", pos: "GK" },
  { id: "vaclik", name: "Tomáš Vaclík", teamCode: "CZE", pos: "GK" },
  { id: "gunn", name: "Angus Gunn", teamCode: "SCO", pos: "GK" },
];

// ── Lists used by the Bonus Picks flow ──
export const GOLDEN_BOOT_PLAYERS = STRIKERS;
export const GOLDEN_GLOVE_FEATURED = GOALKEEPERS.filter((p) => p.featured);
export const GOLDEN_GLOVE_ALL = GOALKEEPERS;

const BALL_ALL = [...STRIKERS, ...MIDFIELDERS, ...DEFENDERS, ...GOLDEN_GLOVE_FEATURED];
/** Golden Ball featured contenders (across positions); search spans BALL_ALL. */
export const GOLDEN_BALL_FEATURED: Player[] = [
  "messi", "mbappe", "yamal", "bellingham", "vinicius", "haaland", "kane",
  "rodri", "musiala", "debruyne", "van-dijk", "hakimi", "e-martinez", "salah",
  "julian-alvarez", "pedri",
]
  .map((id) => BALL_ALL.find((p) => p.id === id))
  .filter((p): p is Player => Boolean(p));
export const GOLDEN_BALL_ALL = BALL_ALL;

// ── Lookup ──
export const ALL_PLAYERS = [...STRIKERS, ...MIDFIELDERS, ...DEFENDERS, ...GOALKEEPERS];
export const PLAYER_BY_ID: Record<string, Player> = Object.fromEntries(
  ALL_PLAYERS.map((p) => [p.id, p]),
);

export function playerName(id: string | null | undefined): string {
  if (!id) return "—";
  return PLAYER_BY_ID[id]?.name ?? id;
}

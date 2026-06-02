// Curated Golden Boot shortlist — the strikers/forwards casual fans will recognize.
// Keeping this to ~40 names (vs. 1,000+ squad players) is the single biggest
// drop-off reducer in the wizard. Searchable; "Not sure yet" is always allowed.

export type Player = {
  id: string;
  name: string;
  teamCode: string;
};

export const PLAYERS: Player[] = [
  { id: "messi", name: "Lionel Messi", teamCode: "ARG" },
  { id: "julian-alvarez", name: "Julián Álvarez", teamCode: "ARG" },
  { id: "lautaro", name: "Lautaro Martínez", teamCode: "ARG" },
  { id: "vinicius", name: "Vinícius Júnior", teamCode: "BRA" },
  { id: "rodrygo", name: "Rodrygo", teamCode: "BRA" },
  { id: "raphinha", name: "Raphinha", teamCode: "BRA" },
  { id: "endrick", name: "Endrick", teamCode: "BRA" },
  { id: "mbappe", name: "Kylian Mbappé", teamCode: "FRA" },
  { id: "dembele", name: "Ousmane Dembélé", teamCode: "FRA" },
  { id: "kane", name: "Harry Kane", teamCode: "ENG" },
  { id: "bellingham", name: "Jude Bellingham", teamCode: "ENG" },
  { id: "saka", name: "Bukayo Saka", teamCode: "ENG" },
  { id: "foden", name: "Phil Foden", teamCode: "ENG" },
  { id: "yamal", name: "Lamine Yamal", teamCode: "ESP" },
  { id: "morata", name: "Álvaro Morata", teamCode: "ESP" },
  { id: "olmo", name: "Dani Olmo", teamCode: "ESP" },
  { id: "ronaldo", name: "Cristiano Ronaldo", teamCode: "POR" },
  { id: "leao", name: "Rafael Leão", teamCode: "POR" },
  { id: "b-fernandes", name: "Bruno Fernandes", teamCode: "POR" },
  { id: "musiala", name: "Jamal Musiala", teamCode: "GER" },
  { id: "wirtz", name: "Florian Wirtz", teamCode: "GER" },
  { id: "havertz", name: "Kai Havertz", teamCode: "GER" },
  { id: "depay", name: "Memphis Depay", teamCode: "NED" },
  { id: "gakpo", name: "Cody Gakpo", teamCode: "NED" },
  { id: "lukaku", name: "Romelu Lukaku", teamCode: "BEL" },
  { id: "debruyne", name: "Kevin De Bruyne", teamCode: "BEL" },
  { id: "haaland", name: "Erling Haaland", teamCode: "NOR" }, // included if NOR qualifies
  { id: "osimhen", name: "Victor Osimhen", teamCode: "NGA" },
  { id: "salah", name: "Mohamed Salah", teamCode: "EGY" },
  { id: "hakimi", name: "Achraf Hakimi", teamCode: "MAR" },
  { id: "en-nesyri", name: "Youssef En-Nesyri", teamCode: "MAR" },
  { id: "mane", name: "Sadio Mané", teamCode: "SEN" },
  { id: "nunez", name: "Darwin Núñez", teamCode: "URU" },
  { id: "valverde", name: "Federico Valverde", teamCode: "URU" },
  { id: "luis-diaz", name: "Luis Díaz", teamCode: "COL" },
  { id: "james", name: "James Rodríguez", teamCode: "COL" },
  { id: "raul-jimenez", name: "Raúl Jiménez", teamCode: "MEX" },
  { id: "pulisic", name: "Christian Pulisic", teamCode: "USA" },
  { id: "balogun", name: "Folarin Balogun", teamCode: "USA" },
  { id: "kudus", name: "Mohammed Kudus", teamCode: "GHA" },
  { id: "mitoma", name: "Kaoru Mitoma", teamCode: "JPN" },
  { id: "son", name: "Son Heung-min", teamCode: "KOR" },
];

export const PLAYER_BY_ID: Record<string, Player> = Object.fromEntries(
  PLAYERS.map((p) => [p.id, p]),
);

export function playerName(id: string | null | undefined): string {
  if (!id) return "Not sure yet";
  return PLAYER_BY_ID[id]?.name ?? id;
}

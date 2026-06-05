// LaFamilia city chapters (from the WhatsApp community groups). Used for the
// signup "chapter" dropdown and the city/chapter community insights. The stored
// value is the display name itself, so insights group cleanly with no mapping.
export const CHAPTERS = [
  "New York",
  "San Francisco",
  "Boston",
  "Miami",
  "Mexico City",
  "Los Angeles",
  "Chicago",
  "Austin",
  "Washington DC",
  "Seattle",
  "Puerto Rico",
  "Ecuador",
  "Europe / UK",
] as const;

/** Value stored for members who aren't in a listed chapter. */
export const OTHER_CHAPTER = "Other";

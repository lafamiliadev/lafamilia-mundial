// Shared kickoff-time formatting. Knockout games are shown in BOTH Pacific and
// Eastern so nobody has to do timezone math (the community spans both coasts).
// Labels are the app convention "PT" / "ET" (generic — reads right in DST too).

function parts(iso: string, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return {
    weekday: get("weekday"),
    month: get("month"),
    day: get("day"),
    time: `${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`,
  };
}

/**
 * "Sun, Jun 28 · 12:00 PM PT / 3:00 PM ET" — the full dual-zone label.
 * The calendar day is taken from Eastern (the app's matchday convention).
 */
export function kickoffLabelDual(iso: string): string {
  const pt = parts(iso, "America/Los_Angeles");
  const et = parts(iso, "America/New_York");
  return `${et.weekday}, ${et.month} ${et.day} · ${pt.time} PT / ${et.time} ET`;
}

/** "12:00 PM PT / 3:00 PM ET" — just the clock times, no date. */
export function kickoffTimesDual(iso: string): string {
  const pt = parts(iso, "America/Los_Angeles");
  const et = parts(iso, "America/New_York");
  return `${pt.time} PT / ${et.time} ET`;
}

import type { ReactNode, SVGProps } from "react";

// LaFamilia icon family — warm, hand-drawn, two-tone. Charcoal outlines with a
// single green accent (the Siembra/LaFamilia green). Soft rounded strokes,
// slightly organic curves, simple silhouettes. Built to feel like a community
// celebration, not a SaaS dashboard. Colors are baked in (these are
// illustrations, not currentColor glyphs); className only sets the size.
const INK = "#2a241d"; // warm charcoal
const GREEN = "#2e9d5b"; // LaFamilia / Siembra green

function Hand({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {children}
      </g>
    </svg>
  );
}

/** Group winners — a grid of groups with one pick crowned (green + check). */
export function GroupsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16.6 7.4 H22.6 a2.6 2.6 0 0 1 2.6 2.6 V15.4 H16.6 Z" fill={GREEN} />
      <g stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M9.2 6.8 H22.8 a2.6 2.6 0 0 1 2.6 2.6 V22.8 a2.6 2.6 0 0 1 -2.6 2.6 H9.2 a2.6 2.6 0 0 1 -2.6 -2.6 V9.4 A2.6 2.6 0 0 1 9.2 6.8 Z" />
        <path d="M16 7.1 C16.1 13 15.9 19 16 25.1" />
        <path d="M6.9 16 C12.5 15.9 19.5 16.1 25.1 16" />
        <path d="M18.4 11.5 l1.5 1.6 l3.1 -3.5" />
      </g>
    </svg>
  );
}

/** Final Four & champion — a trophy with a green cup. */
export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M10.8 7.6 H21.2 V11 A5.2 5.2 0 0 1 10.8 11 Z" fill={GREEN} />
      <g stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M10.5 7.2 H21.5 V11 A5.5 5.5 0 0 1 10.5 11 Z" />
        <path d="M10.6 8.3 C8.2 8.2 7 9.5 7 10.9 C7 12.4 8.3 13.2 10 13.3" />
        <path d="M21.4 8.3 C23.8 8.2 25 9.5 25 10.9 C25 12.4 23.7 13.2 22 13.3" />
        <path d="M16 16.4 V20" />
        <path d="M12.9 20.2 H19.1 L20.4 24.6 H11.6 Z" />
        <path d="M10.3 25.3 C13.5 24.7 18.5 24.7 21.7 25.3" />
      </g>
    </svg>
  );
}

/** Climb the leaderboard — rising bars with a green peak and a little lift. */
export function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M20.4 12 H24.6 V24.4 H20.4 Z" fill={GREEN} />
      <g stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M7 18.6 H11.2 V24.4 H7 Z" />
        <path d="M13.7 15 H17.9 V24.4 H13.7 Z" />
        <path d="M20.4 12 H24.6 V24.4 H20.4 Z" />
        <path d="M5.4 24.7 C12 24.5 20 24.5 26.6 24.7" />
        <path d="M19.6 8.9 L22.5 6.3 L25.4 8.9" />
      </g>
    </svg>
  );
}

/** Support Siembra — a sprout: two green leaves growing from the soil. */
export function SproutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 17.6 C11.4 17.7 8.4 14.4 8.2 9.7 C12.9 9.9 15.9 13.1 16 17.6 Z" fill={GREEN} />
      <path d="M16 16.6 C16.2 12.2 19.1 9.5 23.6 9.7 C23.4 14 20.4 16.7 16 16.6 Z" fill={GREEN} />
      <g stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M16 25.6 C16.1 21.5 15.9 17.5 16 13.6" />
        <path d="M16 17.6 C11.4 17.7 8.4 14.4 8.2 9.7 C12.9 9.9 15.9 13.1 16 17.6 Z" />
        <path d="M16 16.6 C16.2 12.2 19.1 9.5 23.6 9.7 C23.4 14 20.4 16.7 16 16.6 Z" />
        <path d="M10.3 25.6 C13 24 19 24 21.7 25.6" />
      </g>
    </svg>
  );
}

/** Community insights — a friendly pie with a green slice. */
export function InsightsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 16 V6.6 A9.4 9.4 0 0 1 24.3 11.3 Z" fill={GREEN} />
      <g stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M16 6.6 A9.4 9.4 0 1 0 25.4 16 A9.4 9.4 0 0 0 16 6.6 Z" />
        <path d="M16 16 V6.6" />
        <path d="M16 16 L24.3 11.3" />
      </g>
    </svg>
  );
}

/** People — kept simple (utility size in the social-proof pill). */
export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Arrow — utility. */
export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h13" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// Re-export the soft wrapper in case future icons want it.
export { Hand };

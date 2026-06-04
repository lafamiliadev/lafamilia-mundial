import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "gold" | "ghost" | "outline";
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-pitch)] text-white hover:bg-[var(--color-pitch-deep)] shadow-sm",
  gold: "bg-[var(--color-gold)] text-[#3a2b00] hover:brightness-105 shadow-sm",
  ghost: "bg-transparent text-[var(--color-ink)] hover:bg-black/5",
  outline:
    "bg-white text-[var(--color-ink)] border border-[var(--color-line)] hover:border-[var(--color-pitch)]",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold",
        "min-h-[56px] transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; children: ReactNode }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold",
        "min-h-[56px] transition active:scale-[0.98]",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-md px-4 pb-24">{children}</div>;
}

export function TopNav({ active }: { active?: "picks" | "play" | "leaderboard" | "insights" }) {
  const items = [
    { href: "/picks", label: "My Picks", key: "picks" },
    { href: "/leaderboard", label: "Leaderboard", key: "leaderboard" },
    { href: "/insights", label: "Insights", key: "insights" },
  ] as const;
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-1.5 font-extrabold tracking-tight">
          <span className="text-lg">⚽</span>
          <span>La&nbsp;Copa<span className="text-[var(--color-pitch)]">&nbsp;’26</span></span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          {items.map((i) => (
            <Link
              key={i.key}
              href={i.href}
              className={cn(
                "rounded-full px-3 py-1.5 transition",
                active === i.key
                  ? "bg-[var(--color-pitch)] text-white"
                  : "text-[var(--color-muted)] hover:bg-black/5",
              )}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SectionTitle({
  emoji,
  children,
}: {
  emoji?: string;
  children: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
      {emoji && <span aria-hidden>{emoji}</span>}
      {children}
    </h2>
  );
}

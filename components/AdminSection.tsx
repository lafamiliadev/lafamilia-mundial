import type { ReactNode } from "react";

// Collapsible admin section. Native <details>/<summary> — no client JS, fully
// accessible, works in a server component. Keeps the existing card styling so
// the admin page just becomes scannable, not redesigned.
export function AdminSection({
  emoji,
  title,
  defaultOpen = false,
  children,
}: {
  emoji: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="card group mt-6 overflow-hidden" {...(defaultOpen ? { open: true } : {})}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-lg font-black tracking-tight">
          <span aria-hidden>{emoji}</span>
          {title}
        </span>
        <span
          aria-hidden
          className="text-[var(--color-muted)] transition-transform duration-200 group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

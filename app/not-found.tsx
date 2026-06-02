import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="text-6xl">🧭⚽</div>
      <h1 className="mt-4 text-2xl font-black">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-xs text-[var(--color-muted)]">
        The link may be wrong or your entry may have moved. Let&apos;s get you back in the game.
      </p>
      <LinkButton href="/" variant="primary" className="mt-6">
        Back to home
      </LinkButton>
    </main>
  );
}

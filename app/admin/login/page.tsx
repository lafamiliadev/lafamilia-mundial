import { Button } from "@/components/ui";
import { adminLogin } from "@/app/actions/admin";

export const metadata = { title: "Admin · La Copa de LaFamilia 2026" };

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form
        action={adminLogin}
        className="card w-full max-w-sm space-y-4 p-6"
      >
        <div>
          <h1 className="text-xl font-extrabold">Admin access 🔐</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            La Copa de LaFamilia 2026 control room.
          </p>
        </div>
        <input type="hidden" name="next" value={next ?? "/admin"} />
        <input
          name="password"
          type="password"
          autoFocus
          placeholder="Admin password"
          className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none focus:border-[var(--color-pitch)]"
        />
        {error && (
          <p className="text-sm font-semibold text-[var(--color-coral)]">
            Incorrect password. Try again.
          </p>
        )}
        <Button type="submit" className="w-full">
          Enter
        </Button>
      </form>
    </main>
  );
}

import Link from "next/link";
import { EditLookup } from "@/components/EditLookup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get back to your picks · La Copa de LaFamilia 2026" };

export default function EditPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-stadium px-5 pb-10 pt-14 text-white">
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="mb-6 h-10 w-auto" />
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            Welcome back 👋
          </h1>
          <p className="mt-3 text-white/85">
            Already played? Enter the email you used and we&apos;ll take you straight to your
            picks, the leaderboard, and your card. No link to dig up.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-5 py-8">
        <div className="card p-5">
          <EditLookup />
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          Haven&apos;t played yet?{" "}
          <Link href="/play" className="font-semibold underline underline-offset-4">
            Make your predictions →
          </Link>
        </p>
      </section>
    </main>
  );
}

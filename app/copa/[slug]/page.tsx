import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefVisitPing } from "@/components/RefVisitPing";
import { SiembraCTA } from "@/components/Siembra";
import { LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repo = await db();
  const me = await repo.getBySlug(slug);
  if (!me) return { title: "La Copa de LaFamilia 2026" };
  const title = `${me.name} picked ${teamName(me.predictions.champion)} to win · La Copa de LaFamilia 2026`;
  const description = `See ${me.name.split(" ")[0]}'s World Cup bracket and add your own — takes under 2 minutes.`;
  const image = `${env.NEXT_PUBLIC_APP_URL}/api/card/${me.slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1080, height: 1350 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function CopaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = await db();
  const me = await repo.getBySlug(slug);
  if (!me) notFound();

  const firstName = me.name.split(" ")[0];
  const cardUrl = `/api/card/${me.slug}`;
  const playHref = `/play?ref=${me.slug}`;

  return (
    <main className="flex flex-1 flex-col">
      <RefVisitPing slug={me.slug} />

      {/* Warm, community-first header */}
      <section
        className="px-5 pb-7 pt-12 text-center text-white"
        style={{ background: "linear-gradient(160deg, #ff2d6f 0%, #ff6b1a 55%, #ffb627 100%)" }}
      >
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="mx-auto h-9 w-auto" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            ⚽ {firstName} invited you
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight">
            La Copa de LaFamilia 2026
          </h1>
          <p className="mt-2 text-white/90">See {firstName}&apos;s picks — then add your own.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        {/* Branded prediction card */}
        <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt={`${me.name}'s bracket — rooting for ${teamName(me.rootingCountry)}, predicting ${teamName(me.predictions.champion)} to win`}
            width={1080}
            height={1350}
            className="w-full"
          />
        </div>

        {/* CTA — join the game */}
        <div className="mt-6">
          <LinkButton href={playHref} variant="gold" className="w-full text-lg shadow-md">
            Add Your Prediction ⚽
          </LinkButton>
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
            Make your picks in under 2 minutes — no password needed.
          </p>
        </div>

        {/* Siembra — a warm, optional way to support */}
        <div className="mt-8">
          <SiembraCTA />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          La Copa de LaFamilia 2026 · A community game. Not betting — just bragging rights. 🎉
        </p>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wizard } from "@/components/Wizard";
import { db } from "@/lib/db";
import { teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const repo = await db();
  const me = await repo.getByToken(token);
  const title = me
    ? `${me.name} picked ${teamName(me.predictions.champion)} to win · La Copa de LaFamilia 2026`
    : "Edit your predictions · La Copa de LaFamilia 2026";
  const ogImage = `/api/og/${token}`;
  return {
    title,
    openGraph: {
      title,
      description: "Beat my bracket — predict the World Cup with LaFamilia. Takes under 2 minutes.",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImage] },
  };
}

export default async function ResumePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const repo = await db();
  const me = await repo.getByToken(token);
  if (!me) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <Wizard
        mode="edit"
        token={token}
        initial={{
          name: me.name,
          email: me.email,
          rootingCountry: me.rootingCountry,
          champion: me.predictions.champion,
          runnerUp: me.predictions.runnerUp,
          goldenBoot: me.predictions.goldenBoot ?? "__none",
          darkHorse: me.predictions.darkHorse,
          latamFurthest: me.predictions.latamFurthest,
          finalTotalGoals: me.predictions.finalTotalGoals ?? 3,
        }}
      />
    </main>
  );
}

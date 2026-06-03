import { Wizard } from "@/components/Wizard";
import { getGroups } from "@/lib/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "Make your predictions · La Copa de LaFamilia 2026" };

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const groups = await getGroups();
  return (
    <main className="flex flex-1 flex-col">
      <Wizard mode="create" referrer={ref ?? null} groups={groups} />
    </main>
  );
}

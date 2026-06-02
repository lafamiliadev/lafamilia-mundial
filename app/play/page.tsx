import { Wizard } from "@/components/Wizard";

export const metadata = { title: "Make your predictions · La Copa de LaFamilia 2026" };

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <main className="flex flex-1 flex-col">
      <Wizard mode="create" referrer={ref ?? null} />
    </main>
  );
}

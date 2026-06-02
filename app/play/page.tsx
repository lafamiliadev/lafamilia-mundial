import { Wizard } from "@/components/Wizard";

export const metadata = { title: "Make your predictions · La Copa de LaFamilia 2026" };

export default function PlayPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Wizard mode="create" />
    </main>
  );
}

import { redirect } from "next/navigation";

// Community Insights moved to the internal admin area (engagement/comms tool).
// Any old player-facing link lands gently on the home screen.
export const dynamic = "force-dynamic";

export default function InsightsPage() {
  redirect("/");
}

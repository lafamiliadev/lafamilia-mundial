import { PreviewPanel } from "./PreviewPanel";
import { PREVIEW_ENABLED, getPreviewKey } from "@/lib/preview";

// Server gate: renders the dev-only preview panel locally, nothing in production.
export async function PreviewMount() {
  if (!PREVIEW_ENABLED) return null;
  return <PreviewPanel active={await getPreviewKey()} />;
}

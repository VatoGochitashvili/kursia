import { Badge } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n";

/** Course moderation state, rendered with a consistent tone across the app. */
export function StatusBadge({ status, t }: { status: string; t: Dictionary }) {
  const tone =
    status === "PUBLISHED"
      ? "success"
      : status === "SUBMITTED" || status === "UNDER_REVIEW"
        ? "warn"
        : status === "REJECTED"
          ? "danger"
          : status === "CHANGES_REQUESTED"
            ? "accent"
            : "neutral";

  const label = (t.creator[`status${status}` as keyof typeof t.creator] as string) ?? status;
  return <Badge tone={tone as "success" | "warn" | "danger" | "accent" | "neutral"}>{label}</Badge>;
}

import Link from "next/link";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n";

export interface Leader {
  userId: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  role: "OWNER" | "ADMIN";
}

/**
 * Who runs this circle, with their faces.
 *
 * Shown to visitors as well as members: deciding whether to pay for a room
 * means knowing whose room it is. A visitor gets the card without links —
 * member profiles live inside the circle, which they have not joined yet.
 */
export function CircleLeaders({
  leaders,
  profileBase,
  linked,
  t,
}: {
  leaders: Leader[];
  /** `${profileBase}/${userId}` is a member's profile inside this circle. */
  profileBase: string;
  linked: boolean;
  t: Dictionary;
}) {
  if (leaders.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="text-[14px] font-bold">{t.circle.runBy}</h2>
      <ul className="mt-3 grid gap-2.5">
        {leaders.map((leader) => {
          const body = (
            <>
              <Avatar src={leader.avatarUrl} name={leader.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-semibold">{leader.name}</span>
                  {leader.role === "OWNER" ? (
                    <Badge tone="brand">{t.circle.owner}</Badge>
                  ) : (
                    <Badge tone="success">{t.circle.admin}</Badge>
                  )}
                </span>
                {leader.headline && (
                  <span className="mt-0.5 block truncate text-[12px] text-ink-subtle">
                    {leader.headline}
                  </span>
                )}
              </span>
            </>
          );

          return (
            <li key={leader.userId}>
              {linked ? (
                <Link
                  href={`${profileBase}/${leader.userId}`}
                  className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-surface-sunken"
                >
                  {body}
                </Link>
              ) : (
                <span className="flex items-center gap-2.5 p-1.5">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

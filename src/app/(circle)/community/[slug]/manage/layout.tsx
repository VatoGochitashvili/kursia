import { notFound } from "next/navigation";
import { getI18n } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";

export const dynamic = "force-dynamic";

/**
 * The circle's back room.
 *
 * Open to the owner and the admins they appointed. A moderator keeps order in
 * the feed; changing what the circle teaches and sells is not their job, so
 * they get the same 404 as anybody else rather than a locked page telling
 * them the room exists.
 */
export default async function ManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ locale }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { membership } = await loadCommunityPage(slug, viewer?.id ?? null, locale);

  if (!(membership.isOwner || membership.isAdmin || membership.isCircleAdmin)) notFound();

  return <>{children}</>;
}

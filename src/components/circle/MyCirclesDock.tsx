import { getI18n } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { listMyCircles } from "@/lib/my-circles";
import { MyCirclesLauncher } from "@/components/circle/MyCirclesLauncher";

/**
 * Loads the viewer's circles for the launcher.
 *
 * Server-side so a signed-out visitor ships none of it: no query, no list of
 * anybody's memberships in the HTML, and no client bundle for a button they
 * would never see.
 */
export async function MyCirclesDock() {
  const [{ locale, t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (!user) return null;

  const circles = await listMyCircles(user.id, locale);
  if (circles.length === 0) return null;

  return (
    <MyCirclesLauncher
      circles={circles}
      locale={locale}
      labels={{
        title: t.circle.myCircles,
        owner: t.circle.owner,
        admin: t.circle.admin,
        browse: t.circle.allCircles,
      }}
    />
  );
}

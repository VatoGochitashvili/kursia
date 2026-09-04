import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { COURSE_CARD_SELECT } from "@/lib/courses";
import { PageHeader } from "@/components/layout/DashboardShell";
import { CourseCard } from "@/components/course/CourseCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();

  const items = await db.wishlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, course: { select: COURSE_CARD_SELECT } },
  });

  return (
    <>
      <PageHeader title={t.nav.wishlist} subtitle={t.dashboard.wishlist} />

      {items.length === 0 ? (
        <EmptyState
          icon={<Icon name="heart" size={30} />}
          title={t.common.empty}
          body={t.dashboard.noCoursesHint}
          action={
            <ButtonLink href={localePath("/courses", locale)}>
              {t.dashboard.browseCourses}
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <CourseCard key={item.id} course={item.course} locale={locale} t={t} />
          ))}
        </div>
      )}
    </>
  );
}

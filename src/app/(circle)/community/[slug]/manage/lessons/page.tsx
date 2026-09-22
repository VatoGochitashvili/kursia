import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { formatDate } from "@/lib/format";
import { effectivePriceMinor, formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Lessons", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Every lesson in this circle's classroom, and the way to add another. */
export default async function ManageLessonsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator } = await loadCommunityPage(slug, viewer?.id ?? null, locale);
  const p = (path: string) => localePath(path, locale);
  const base = p(`/community/${creator.slug}/manage/lessons`);

  const courses = await db.course.findMany({
    where: { creatorId: creator.id },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true, title: true, subtitle: true, status: true, lessonCount: true,
      studentCount: true, priceMinor: true, discountPriceMinor: true, currency: true,
      includedInMembership: true, updatedAt: true,
    },
  });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.2rem] font-bold tracking-tight">{t.circle.tabClassroom}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{t.circle.manageLessonsHint}</p>
        </div>
        <ButtonLink href={`${base}/new`}>
          <Icon name="plus" size={16} />
          {t.creator.newCourse}
        </ButtonLink>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<Icon name="video" size={30} />}
          title={t.creator.createFirstCourse}
          action={<ButtonLink href={`${base}/new`}>{t.creator.newCourse}</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-2.5">
          {courses.map((course) => (
            <li key={course.id}>
              <Link href={`${base}/${course.id}`}>
                <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-brand-200">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name="video" size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14.5px] font-semibold">{course.title}</span>
                      <StatusBadge status={course.status} t={t} />
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-subtle">
                      {course.lessonCount} {t.common.lessons} ·{" "}
                      {course.includedInMembership
                        ? t.membership.includedInMembership
                        : formatMoney(
                            effectivePriceMinor(course.priceMinor, course.discountPriceMinor),
                            course.currency,
                          )}{" "}
                      · {formatDate(course.updatedAt, locale)}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} className="shrink-0 text-ink-subtle" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

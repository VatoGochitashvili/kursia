import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { loadCommunityPage } from "@/lib/community-page";
import { getCategoryTree } from "@/lib/courses";
import { NewCourseForm } from "@/components/creator/NewCourseForm";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "New class", robots: { index: false } };
export const dynamic = "force-dynamic";

/** A new lesson in this circle's classroom, created by its owner or an admin. */
export default async function ManageNewLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getSessionUser()]);
  const { creator } = await loadCommunityPage(slug, viewer?.id ?? null, locale);
  const [categories] = await Promise.all([getCategoryTree()]);
  const p = (path: string) => localePath(path, locale);
  const base = p(`/community/${creator.slug}/manage/classes`);

  return (
    <div className="grid gap-4">
      <Link
        href={base}
        className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <Icon name="arrowLeft" size={15} />
        {t.circle.tabClassroom}
      </Link>

      <h2 className="text-[1.2rem] font-bold tracking-tight">{t.creator.newCourse}</h2>

      <Card className="max-w-xl p-6">
        <NewCourseForm
          creatorId={creator.id}
          redirectTo={base}
          categories={categories.map((c) => ({
            id: c.id,
            name: locale === "en" ? c.nameEn : c.nameKa,
            children: c.children.map((child) => ({
              id: child.id,
              name: locale === "en" ? child.nameEn : child.nameKa,
            })),
          }))}
          labels={{
            title: locale === "en" ? "Class title" : "გაკვეთილის სათაური",
            titleHint:
              locale === "en"
                ? "What will members be able to do afterwards?"
                : "რის გაკეთებას შეძლებს წევრი ამ გაკვეთილის შემდეგ?",
            category: t.courses.filterCategory,
            language: t.courses.filterLanguage,
            submit: t.common.create,
            selectCategory: locale === "en" ? "Select a category" : "აირჩიეთ კატეგორია",
          }}
        />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { requireCreator } from "@/lib/auth/rbac";
import { getCategoryTree } from "@/lib/courses";
import { PageHeader } from "@/components/layout/DashboardShell";
import { NewCourseForm } from "@/components/creator/NewCourseForm";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "New course", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const { locale, t } = await getI18n();
  await requireCreator();
  const categories = await getCategoryTree();

  return (
    <>
      <PageHeader
        title={t.creator.newCourse}
        subtitle={
          locale === "en"
            ? "Start with a working title — you can change everything later."
            : "დაიწყე სამუშაო სათაურით — ყველაფრის შეცვლა მოგვიანებით შეგიძლია."
        }
      />

      <Card className="max-w-xl p-6">
        <NewCourseForm
          categories={categories.map((c) => ({
            id: c.id,
            name: locale === "en" ? c.nameEn : c.nameKa,
            children: c.children.map((child) => ({
              id: child.id,
              name: locale === "en" ? child.nameEn : child.nameKa,
            })),
          }))}
          labels={{
            title: locale === "en" ? "Course title" : "კურსის სათაური",
            titleHint:
              locale === "en"
                ? "What will students be able to do afterwards?"
                : "რის გაკეთებას შეძლებს სტუდენტი კურსის შემდეგ?",
            category: t.courses.filterCategory,
            language: t.courses.filterLanguage,
            submit: t.common.create,
            selectCategory: locale === "en" ? "Select a category" : "აირჩიეთ კატეგორია",
          }}
        />
      </Card>
    </>
  );
}

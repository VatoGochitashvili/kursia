import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { requireCourseOwner } from "@/lib/auth/rbac";
import { getCategoryTree } from "@/lib/courses";
import { parseStringArray } from "@/lib/json";
import { toMajor } from "@/lib/money";
import { CourseBuilder } from "@/components/creator/CourseBuilder";

export const metadata: Metadata = { title: "Course builder", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CourseBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ownership is checked before a single field is read.
  await requireCourseOwner(id);

  const [{ locale, t }, settings, course, categories] = await Promise.all([
    getI18n(),
    getSettings(),
    db.course.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, slug: true, title: true, subtitle: true, description: true,
        thumbnailUrl: true, categoryId: true, subcategoryId: true, language: true,
        level: true, status: true, priceMinor: true, discountPriceMinor: true,
        currency: true, hasCertificate: true, metaTitle: true, metaDescription: true,
        learningOutcomes: true, requirements: true, targetAudience: true,
        reviewerNote: true,
        faqs: { orderBy: { sortOrder: "asc" }, select: { question: true, answer: true } },
        modules: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true, title: true, description: true, sortOrder: true,
            lessons: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true, title: true, description: true, type: true, sortOrder: true,
                moduleId: true, isFreePreview: true, isPublished: true,
                durationSeconds: true, textContent: true, assetKey: true,
              },
            },
          },
        },
      },
    }),
    getCategoryTree(),
  ]);

  return (
    <CourseBuilder
      locale={locale}
      t={t}
      approvalRequired={settings.courseApprovalRequired}
      course={{
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle ?? "",
        description: course.description ?? "",
        thumbnailUrl: course.thumbnailUrl ?? "",
        categoryId: course.categoryId ?? "",
        subcategoryId: course.subcategoryId ?? "",
        language: course.language,
        level: course.level,
        status: course.status,
        // Prices are edited in major units; the API converts back to minor.
        price: String(toMajor(course.priceMinor, course.currency)),
        discountPrice:
          course.discountPriceMinor === null
            ? ""
            : String(toMajor(course.discountPriceMinor, course.currency)),
        currency: course.currency,
        hasCertificate: course.hasCertificate,
        metaTitle: course.metaTitle ?? "",
        metaDescription: course.metaDescription ?? "",
        learningOutcomes: parseStringArray(course.learningOutcomes),
        requirements: parseStringArray(course.requirements),
        targetAudience: parseStringArray(course.targetAudience),
        faqs: course.faqs,
        reviewerNote: course.reviewerNote,
      }}
      modules={course.modules}
      categories={categories.map((c) => ({
        id: c.id,
        name: locale === "en" ? c.nameEn : c.nameKa,
        children: c.children.map((child) => ({
          id: child.id,
          name: locale === "en" ? child.nameEn : child.nameKa,
        })),
      }))}
    />
  );
}

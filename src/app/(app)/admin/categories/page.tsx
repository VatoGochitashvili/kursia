import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { getCategoryTree } from "@/lib/courses";
import { PageHeader } from "@/components/layout/DashboardShell";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = { title: "Categories", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const [{ locale, t }, categories] = await Promise.all([getI18n(), getCategoryTree()]);

  return (
    <>
      <PageHeader
        title={t.admin.categories}
        subtitle={
          locale === "en"
            ? "Categories drive navigation, filters, the homepage grid and the sitemap. Nothing is hard-coded."
            : "კატეგორიები მართავს ნავიგაციას, ფილტრებს, მთავარ გვერდსა და sitemap-ს. არაფერია კოდში ჩაწერილი."
        }
      />

      <CategoryManager
        locale={locale}
        categories={categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          nameKa: category.nameKa,
          nameEn: category.nameEn,
          icon: category.icon,
          colorHex: category.colorHex,
          isActive: true,
          courseCount: category.courseCount,
          children: category.children.map((child) => ({
            id: child.id,
            slug: child.slug,
            nameKa: child.nameKa,
            nameEn: child.nameEn,
            icon: child.icon,
            colorHex: child.colorHex,
            isActive: true,
            courseCount: child.courseCount,
            children: [],
          })),
        }))}
        labels={{
          add: t.common.add,
          addChild: locale === "en" ? "Add subcategory" : "ქვეკატეგორიის დამატება",
          nameKa: locale === "en" ? "Name (Georgian)" : "სახელი (ქართული)",
          nameEn: locale === "en" ? "Name (English)" : "სახელი (ინგლისური)",
          icon: locale === "en" ? "Icon" : "აიკონი",
          color: locale === "en" ? "Colour" : "ფერი",
          save: t.common.save,
          cancel: t.common.cancel,
          edit: t.common.edit,
          delete: t.common.delete,
          courses: t.nav.courses,
          confirmDelete:
            locale === "en" ? "Delete this category?" : "წავშალოთ ეს კატეგორია?",
          inUse:
            locale === "en"
              ? "Categories with courses cannot be deleted."
              : "კატეგორია, რომელსაც კურსები იყენებს, ვერ წაიშლება.",
        }}
      />
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getCategoryTree } from "@/lib/courses";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import { Breadcrumbs, Card, JsonLd } from "@/components/ui/primitives";
import { Icon, categoryIcon } from "@/components/ui/Icon";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.nav.categories,
    description:
      locale === "en"
        ? "Browse every course category — business, programming, design, marketing, finance and more."
        : "დაათვალიერე ყველა კატეგორია — ბიზნესი, პროგრამირება, დიზაინი, მარკეტინგი, ფინანსები და სხვა.",
    path: "/categories",
    locale,
  });
}

/** Category index — a hub page that gives crawlers a route to every category. */
export default async function CategoriesPage() {
  const [{ locale, t }, categories] = await Promise.all([getI18n(), getCategoryTree()]);
  const p = (path: string) => localePath(path, locale);

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: locale === "en" ? "Home" : "მთავარი", href: p("/") },
              { label: t.nav.categories },
            ]}
          />
          <h1 className="text-3xl sm:text-4xl">{t.home.categoriesTitle}</h1>
          <p className="mt-2 text-[15px] text-ink-muted">{t.home.categoriesSubtitle}</p>
        </div>
      </div>

      <div className="container-page py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.slug}>
              <Card className="h-full p-5 transition-all hover:border-brand-200 hover:shadow-md">
                <Link href={p(`/category/${category.slug}`)} className="flex items-start gap-3">
                  <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${category.colorHex ?? "#3559f0"}18`,
                      color: category.colorHex ?? "#3559f0",
                    }}
                  >
                    <Icon name={categoryIcon(category.icon)} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-ink">
                      {locale === "en" ? category.nameEn : category.nameKa}
                    </span>
                    <span className="block text-[12px] text-ink-subtle">
                      {category.courseCount} {t.nav.courses.toLowerCase()}
                    </span>
                  </span>
                </Link>

                {category.children.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3.5">
                    {category.children.map((child) => (
                      <li key={child.slug}>
                        <Link
                          href={p(`/category/${child.slug}`)}
                          className="inline-block rounded-full bg-surface-sunken px-2.5 py-1 text-[12px] text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          {locale === "en" ? child.nameEn : child.nameKa}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <JsonLd
        data={breadcrumbSchema(
          [
            { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
            { name: t.nav.categories, path: "/categories" },
          ],
          locale,
        )}
      />
    </>
  );
}

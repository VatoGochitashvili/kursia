import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath, fill } from "@/i18n";
import { searchCourses } from "@/lib/courses";
import { courseSearchSchema } from "@/lib/validation";
import { breadcrumbSchema, buildMetadata, itemListSchema } from "@/lib/seo";
import { CourseCard } from "@/components/course/CourseCard";
import { SortSelect } from "@/components/course/CourseFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Breadcrumbs, EmptyState, JsonLd, Tag } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, categoryIcon } from "@/components/ui/Icon";
import { Suspense } from "react";

/**
 * Category hub — /category/[slug].
 *
 * These are the pages that win category-level search traffic ("პროგრამირების
 * კურსები"), so each one is server-rendered with its own title, description,
 * breadcrumb trail and an ItemList of the courses it contains.
 */
export const revalidate = 600;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function loadCategory(slug: string) {
  return db.category.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, nameKa: true, nameEn: true,
      descriptionKa: true, descriptionEn: true, icon: true, colorHex: true,
      isActive: true,
      parent: { select: { slug: true, nameKa: true, nameEn: true } },
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true, nameKa: true, nameEn: true,
          _count: { select: { courses: { where: { status: "PUBLISHED" } } } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return { title: "404" };

  const { locale } = await getI18n();
  const name = locale === "en" ? category.nameEn : category.nameKa;
  const description = locale === "en" ? category.descriptionEn : category.descriptionKa;

  return buildMetadata({
    title: locale === "en" ? `${name} courses` : `${name} — ონლაინ კურსები`,
    description:
      description ??
      (locale === "en"
        ? `Online ${name} courses from Georgian and international instructors.`
        : `${name} — ონლაინ კურსები ქართველი და საერთაშორისო ინსტრუქტორებისგან. ისწავლე შენი ტემპით.`),
    path: `/category/${category.slug}`,
    locale,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [category, { locale, t }, raw] = await Promise.all([
    loadCategory(slug),
    getI18n(),
    searchParams,
  ]);

  if (!category || !category.isActive) notFound();

  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value !== "") flat[key] = value;
  }

  const parsed = courseSearchSchema.safeParse(flat);
  const results = await searchCourses({
    ...(parsed.success ? parsed.data : {}),
    category: category.slug,
    perPage: 12,
  });

  const p = (path: string) => localePath(path, locale);
  const name = locale === "en" ? category.nameEn : category.nameKa;
  const description = locale === "en" ? category.descriptionEn : category.descriptionKa;

  const breadcrumbs = [
    { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
    { name: t.nav.categories, path: "/categories" },
    ...(category.parent
      ? [
          {
            name: locale === "en" ? category.parent.nameEn : category.parent.nameKa,
            path: `/category/${category.parent.slug}`,
          },
        ]
      : []),
    { name, path: `/category/${category.slug}` },
  ];

  const buildHref = (page: number) => {
    const next = new URLSearchParams(flat);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    const qs = next.toString();
    return `${p(`/category/${category.slug}`)}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <section className="border-b border-line bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            className="mb-5"
            items={breadcrumbs.slice(0, -1).map((b) => ({ label: b.name, href: p(b.path) }))}
          />

          <div className="flex items-start gap-4">
            <span
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: `${category.colorHex ?? "#3559f0"}18`,
                color: category.colorHex ?? "#3559f0",
              }}
            >
              <Icon name={categoryIcon(category.icon)} size={26} />
            </span>

            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl">{name}</h1>
              {description && (
                <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">{description}</p>
              )}
              <p className="mt-2 text-[13px] text-ink-subtle">
                {fill(t.courses.resultsCount, { count: results.total })}
              </p>
            </div>
          </div>

          {/* Subcategories double as internal links for crawlers. */}
          {category.children.length > 0 && (
            <nav className="mt-6 flex flex-wrap gap-2" aria-label={t.nav.categories}>
              {category.children.map((child) => (
                <Tag key={child.slug} href={p(`/category/${child.slug}`)}>
                  {locale === "en" ? child.nameEn : child.nameKa}
                  <span className="ms-1.5 text-ink-subtle">{child._count.courses}</span>
                </Tag>
              ))}
            </nav>
          )}
        </div>
      </section>

      <div className="container-page py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {fill(t.courses.resultsCount, { count: results.total })}
          </p>
          <Suspense fallback={null}>
            <SortSelect
              label={t.common.sort}
              options={[
                { value: "relevance", label: t.courses.sortRelevance },
                { value: "popular", label: t.courses.sortPopular },
                { value: "newest", label: t.courses.sortNewest },
                { value: "rating", label: t.courses.sortRating },
                { value: "price_asc", label: t.courses.sortPriceAsc },
                { value: "price_desc", label: t.courses.sortPriceDesc },
              ]}
            />
          </Suspense>
        </div>

        {results.courses.length === 0 ? (
          <EmptyState
            icon={<Icon name="book" size={30} />}
            title={t.courses.noResults}
            body={t.courses.noResultsHint}
            action={<ButtonLink href={p("/courses")}>{t.dashboard.browseCourses}</ButtonLink>}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.courses.map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  locale={locale}
                  t={t}
                  priority={i < 4}
                />
              ))}
            </div>

            <Pagination
              page={results.page}
              totalPages={results.totalPages}
              buildHref={buildHref}
              labels={{ previous: t.common.previous, next: t.common.next, page: t.common.page }}
            />
          </>
        )}
      </div>

      <JsonLd
        data={[
          breadcrumbSchema(breadcrumbs, locale),
          itemListSchema(
            results.courses.map((c) => ({ name: c.title, path: `/courses/${c.slug}` })),
            locale,
            name,
          ),
        ]}
      />
    </>
  );
}

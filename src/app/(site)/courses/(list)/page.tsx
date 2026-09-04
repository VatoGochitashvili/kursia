import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getI18n, localePath, fill } from "@/i18n";
import { searchCourses, getCategoryTree } from "@/lib/courses";
import { courseSearchSchema } from "@/lib/validation";
import { buildMetadata, itemListSchema, breadcrumbSchema } from "@/lib/seo";
import { COURSE_LEVELS } from "@/lib/enums";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseFilters, SortSelect } from "@/components/course/CourseFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Breadcrumbs, EmptyState, JsonLd } from "@/components/ui/primitives";
import { SearchBar } from "@/components/layout/SearchBar";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The catalogue is server-rendered on every request (filters live in the URL),
 * so each filtered view is its own indexable page. Filtered/paginated views
 * are canonicalised to avoid thin duplicate content in the index.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q : undefined;
  const hasFilters = Object.keys(raw).some((k) => k !== "page" && raw[k]);

  return buildMetadata({
    title: q ? `„${q}" — ${t.courses.browseTitle}` : t.courses.browseTitle,
    description: q
      ? `${t.courses.browseSubtitle} — ${q}`
      : "დაათვალიერე ყველა ონლაინ კურსი: ბიზნესი, პროგრამირება, მარკეტინგი, დიზაინი, ფინანსები და სხვა. ფილტრი ფასით, დონით და შეფასებით.",
    path: "/courses",
    locale,
    // A search-results permutation adds no unique value to the index; the
    // canonical always points at the clean catalogue URL.
    noindex: Boolean(q),
  });
}

export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, t } = await getI18n();
  const raw = await searchParams;

  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v !== "") flat[k] = v;
  }

  // Unknown/invalid query parameters degrade to defaults rather than 500-ing.
  const parsed = courseSearchSchema.safeParse(flat);
  const params = parsed.success ? parsed.data : {};

  const [results, categories, languages] = await Promise.all([
    searchCourses({ ...params, perPage: 12 }),
    getCategoryTree(),
    db.course.groupBy({
      by: ["language"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    }),
  ]);

  const activeCount = ["category", "level", "language", "rating", "price"].filter(
    (k) => flat[k] && flat[k] !== "all",
  ).length;

  const buildHref = (page: number) => {
    const next = new URLSearchParams(flat);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    const qs = next.toString();
    return `${localePath("/courses", locale)}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: locale === "en" ? "Home" : "მთავარი", href: localePath("/", locale) },
              { label: t.courses.browseTitle },
            ]}
          />
          <h1 className="text-3xl sm:text-4xl">
            {params.q ? `„${params.q}"` : t.courses.browseTitle}
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">{t.courses.browseSubtitle}</p>
          <div className="mt-6 max-w-xl">
            <SearchBar
              placeholder={t.home.heroSearchPlaceholder}
              defaultValue={params.q ?? ""}
              action={localePath("/courses", locale)}
            />
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
          <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
            <CourseFilters
              activeCount={activeCount}
              groups={{
                categories: categories.map((c) => ({
                  value: c.slug,
                  label: locale === "en" ? c.nameEn : c.nameKa,
                  count: c.courseCount,
                })),
                levels: COURSE_LEVELS.map((level) => ({
                  value: level,
                  label: t.courses[`level${level}` as keyof typeof t.courses] as string,
                })),
                languages: languages.map((l) => ({
                  value: l.language,
                  label: (t.courses[`lang${l.language}` as keyof typeof t.courses] as string) ?? l.language,
                  count: l._count._all,
                })),
              }}
              labels={{
                filters: t.common.filters,
                category: t.courses.filterCategory,
                price: t.courses.filterPrice,
                level: t.courses.filterLevel,
                language: t.courses.filterLanguage,
                rating: t.courses.filterRating,
                priceAll: t.courses.priceAll,
                priceFree: t.courses.priceFree,
                pricePaid: t.courses.pricePaid,
                ratingAndUp: t.courses.ratingAndUp,
                all: t.common.all,
                clearAll: t.common.clearAll,
                apply: t.common.apply,
                close: t.common.close,
              }}
            />
          </Suspense>

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-muted" aria-live="polite">
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
                icon={<Icon name="search" size={30} />}
                title={t.courses.noResults}
                body={t.courses.noResultsHint}
                action={
                  <ButtonLink href={localePath("/courses", locale)} variant="outline">
                    {t.common.clearAll}
                  </ButtonLink>
                }
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.courses.map((course, i) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      locale={locale}
                      t={t}
                      priority={i < 3}
                    />
                  ))}
                </div>

                <Pagination
                  page={results.page}
                  totalPages={results.totalPages}
                  buildHref={buildHref}
                  labels={{
                    previous: t.common.previous,
                    next: t.common.next,
                    page: t.common.page,
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <JsonLd
        data={[
          breadcrumbSchema(
            [
              { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
              { name: t.courses.browseTitle, path: "/courses" },
            ],
            locale,
          ),
          itemListSchema(
            results.courses.map((c) => ({ name: c.title, path: `/courses/${c.slug}` })),
            locale,
            t.courses.browseTitle,
          ),
        ]}
      />
    </>
  );
}

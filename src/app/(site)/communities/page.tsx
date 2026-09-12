import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { buildMetadata } from "@/lib/seo";
import { listCommunities, listCommunityCategories, type CommunitySort } from "@/lib/communities";
import { CommunityCard } from "@/components/community/CommunityCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { Stagger } from "@/components/ui/Stagger";
import { cn } from "@/lib/cn";

export const revalidate = 300;

interface Props {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.communities.title,
    description: t.communities.subtitle,
    path: "/communities",
    locale,
  });
}

const SORTS: CommunitySort[] = ["popular", "new", "free"];

/**
 * The directory — the main way in to the site.
 *
 * Filtering happens in the URL rather than in client state, so a category or a
 * search is a link somebody can send to a friend, the back button works, and
 * the unfiltered view stays cacheable.
 */
export default async function CommunitiesPage({ searchParams }: Props) {
  const [{ locale, t }, params] = await Promise.all([getI18n(), searchParams]);
  const p = (path: string) => localePath(path, locale);

  const sort = (SORTS as string[]).includes(params.sort ?? "")
    ? (params.sort as CommunitySort)
    : "popular";
  const search = params.q?.trim() || undefined;

  const [communities, categories] = await Promise.all([
    listCommunities({ locale, categorySlug: params.category, sort, search }),
    listCommunityCategories(locale),
  ]);

  const buildHref = (next: { category?: string | null; sort?: string }) => {
    const sp = new URLSearchParams();
    const category = next.category === undefined ? params.category : next.category;
    if (category) sp.set("category", category);
    const s = next.sort ?? sort;
    if (s !== "popular") sp.set("sort", s);
    if (search) sp.set("q", search);
    const qs = sp.toString();
    return p(`/communities${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="container-page py-8 sm:py-11">
      <header className="max-w-2xl">
        <h1 className="text-[2rem]/[1.18] font-bold tracking-tight sm:text-[2.6rem]/[1.14]">
          {t.communities.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted sm:text-base">
          {t.communities.subtitle}
        </p>
      </header>

      {/* Sort */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        {SORTS.map((key) => (
          <Link
            key={key}
            href={buildHref({ sort: key })}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold transition-colors",
              sort === key
                ? "bg-ink text-white"
                : "bg-surface-sunken text-ink-muted hover:text-ink",
            )}
          >
            {key === "popular"
              ? t.communities.sortPopular
              : key === "new"
                ? t.communities.sortNew
                : t.communities.sortFree}
          </Link>
        ))}
      </div>

      {/* Categories — only those with something in them. */}
      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={buildHref({ category: null })}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
              !params.category
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-line text-ink-muted hover:border-brand-200 hover:text-ink",
            )}
          >
            {t.communities.all}
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={buildHref({ category: category.slug })}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                params.category === category.slug
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-line text-ink-muted hover:border-brand-200 hover:text-ink",
              )}
            >
              {category.name}
              <span className="text-[11px] tabular-nums opacity-60">{category.count}</span>
            </Link>
          ))}
        </div>
      )}

      {communities.length === 0 ? (
        <Card className="mt-8 p-12 text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="users" size={28} />
          </span>
          <h2 className="mt-5 text-xl">
            {params.category || search ? t.communities.empty : t.communities.noneYet}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            {params.category || search ? t.communities.emptyBody : t.communities.noneYetBody}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {(params.category || search) && (
              <ButtonLink href={p("/communities")} variant="outline">
                {t.communities.all}
              </ButtonLink>
            )}
            <ButtonLink href={p("/become-instructor")}>{t.communities.startYours}</ButtonLink>
          </div>
        </Card>
      ) : (
        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <CommunityCard
              key={community.creatorId}
              community={community}
              href={p(`/community/${community.slug}`)}
              t={t}
            />
          ))}
        </Stagger>
      )}
    </div>
  );
}

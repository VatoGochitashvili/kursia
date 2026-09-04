import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getPopularCreators } from "@/lib/courses";
import { breadcrumbSchema, buildMetadata, itemListSchema } from "@/lib/seo";
import { CreatorCard } from "@/components/course/CreatorCard";
import { Breadcrumbs, EmptyState, JsonLd } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 900;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.nav.creators,
    description:
      locale === "en"
        ? "Meet the Georgian and international instructors teaching on the platform."
        : "გაიცანით ქართველი და საერთაშორისო ინსტრუქტორები, რომლებიც პლატფორმაზე ასწავლიან.",
    path: "/instructors",
    locale,
  });
}

export default async function InstructorsPage() {
  const [{ locale, t }, creators] = await Promise.all([getI18n(), getPopularCreators(48)]);
  const p = (path: string) => localePath(path, locale);

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: locale === "en" ? "Home" : "მთავარი", href: p("/") },
              { label: t.nav.creators },
            ]}
          />
          <h1 className="text-3xl sm:text-4xl">{t.home.creatorsTitle}</h1>
          <p className="mt-2 text-[15px] text-ink-muted">{t.home.creatorsSubtitle}</p>
        </div>
      </div>

      <div className="container-page py-10">
        {creators.length === 0 ? (
          <EmptyState
            icon={<Icon name="users" size={30} />}
            title={t.common.empty}
            action={
              <ButtonLink href={p("/become-instructor")}>{t.nav.becomeCreator}</ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} locale={locale} t={t} />
            ))}
          </div>
        )}
      </div>

      <JsonLd
        data={[
          breadcrumbSchema(
            [
              { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
              { name: t.nav.creators, path: "/instructors" },
            ],
            locale,
          ),
          itemListSchema(
            creators.map((c) => ({ name: c.displayName, path: `/creator/${c.slug}` })),
            locale,
            t.nav.creators,
          ),
        ]}
      />
    </>
  );
}

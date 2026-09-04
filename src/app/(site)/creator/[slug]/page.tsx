import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { COURSE_CARD_SELECT } from "@/lib/courses";
import { parseStringArray } from "@/lib/json";
import { formatCount, formatDate, formatRating } from "@/lib/format";
import { breadcrumbSchema, buildMetadata, itemListSchema, personSchema } from "@/lib/seo";
import { toPlainText } from "@/lib/sanitize";
import { CourseCard } from "@/components/course/CourseCard";
import {
  Avatar, Badge, Breadcrumbs, Card, EmptyState, JsonLd, Stars,
} from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Public instructor page — /creator/[slug].
 *
 * Fully server-rendered and indexable: this is the page a creator shares, and
 * the one that ranks for their name. It carries Person structured data and
 * links to every published course they have.
 */
export const revalidate = 600;

interface Props {
  params: Promise<{ slug: string }>;
}

async function loadCreator(slug: string) {
  const creator = await db.creatorProfile.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, displayName: true, instructorBio: true,
      expertise: true, isVerified: true, createdAt: true,
      user: {
        select: {
          status: true,
          createdAt: true,
          profile: {
            select: {
              fullName: true, avatarUrl: true, headline: true, bio: true, city: true,
              websiteUrl: true, linkedinUrl: true, youtubeUrl: true,
              facebookUrl: true, instagramUrl: true,
            },
          },
        },
      },
      courses: {
        where: { status: "PUBLISHED" },
        orderBy: [{ studentCount: "desc" }, { publishedAt: "desc" }],
        select: COURSE_CARD_SELECT,
      },
    },
  });

  // A suspended creator's page disappears from the public site.
  if (!creator || creator.user.status !== "ACTIVE") return null;
  return creator;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const creator = await loadCreator(slug);
  // Raise the 404 before any bytes stream — see the note on the course page.
  if (!creator) notFound();

  const { locale } = await getI18n();
  const headline = creator.user.profile?.headline;

  return buildMetadata({
    title: `${creator.displayName}${headline ? ` — ${headline}` : ""}`,
    description:
      toPlainText(creator.instructorBio ?? creator.user.profile?.bio, 160) ||
      `${creator.displayName} — ${creator.courses.length} ონლაინ კურსი.`,
    path: `/creator/${creator.slug}`,
    locale,
    image: creator.user.profile?.avatarUrl,
    type: "profile",
  });
}

export default async function CreatorPage({ params }: Props) {
  const { slug } = await params;
  const [creator, { locale, t }, settings] = await Promise.all([
    loadCreator(slug),
    getI18n(),
    getSettings(),
  ]);

  if (!creator) notFound();

  const p = (path: string) => localePath(path, locale);
  const profile = creator.user.profile;
  const expertise = parseStringArray(creator.expertise);

  const stats = creator.courses.reduce(
    (acc, course) => ({
      students: acc.students + course.studentCount,
      ratingCount: acc.ratingCount + course.ratingCount,
      weighted: acc.weighted + course.ratingAvg * course.ratingCount,
    }),
    { students: 0, ratingCount: 0, weighted: 0 },
  );
  const averageRating =
    stats.ratingCount > 0 ? Math.round((stats.weighted / stats.ratingCount) * 10) / 10 : 0;

  const socials: { url: string | null; icon: IconName; label: string }[] = [
    { url: profile?.websiteUrl ?? null, icon: "globe", label: "Website" },
    { url: profile?.linkedinUrl ?? null, icon: "briefcase", label: "LinkedIn" },
    { url: profile?.youtubeUrl ?? null, icon: "video", label: "YouTube" },
    { url: profile?.facebookUrl ?? null, icon: "users", label: "Facebook" },
    { url: profile?.instagramUrl ?? null, icon: "camera", label: "Instagram" },
  ];

  const breadcrumbs = [
    { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
    { name: t.nav.creators, path: "/instructors" },
    { name: creator.displayName, path: `/creator/${creator.slug}` },
  ];

  return (
    <>
      <section className="border-b border-line bg-surface-muted">
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs
            className="mb-6"
            items={breadcrumbs.slice(0, -1).map((b) => ({ label: b.name, href: p(b.path) }))}
          />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar
              src={profile?.avatarUrl}
              name={creator.displayName}
              size={104}
              className="shadow-md"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl sm:text-4xl">{creator.displayName}</h1>
                {creator.isVerified && (
                  <Badge tone="brand">
                    <Icon name="check" size={12} />
                    {t.admin.verify}
                  </Badge>
                )}
              </div>

              {profile?.headline && (
                <p className="mt-2 text-[15px] text-ink-muted sm:text-base">{profile.headline}</p>
              )}

              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                <StatBlock
                  label={t.common.students}
                  value={formatCount(stats.students, locale)}
                />
                <StatBlock label={t.nav.courses} value={String(creator.courses.length)} />
                <StatBlock
                  label={t.common.rating}
                  value={formatRating(averageRating)}
                  extra={averageRating > 0 ? <Stars rating={averageRating} size={13} /> : null}
                />
                <StatBlock
                  label={t.common.reviews}
                  value={formatCount(stats.ratingCount, locale)}
                />
              </dl>

              {(socials.some((s) => s.url) || profile?.city) && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {profile?.city && (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <Icon name="target" size={14} />
                      {profile.city}
                    </span>
                  )}
                  {socials
                    .filter((s) => s.url)
                    .map((social) => (
                      <a
                        key={social.label}
                        href={social.url!}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        aria-label={social.label}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:border-brand-200 hover:text-brand-600"
                      >
                        <Icon name={social.icon} size={16} />
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0">
            <h2 className="mb-5 text-2xl">
              {t.profile.coursesCreated}
              <span className="ms-2 text-base font-normal text-ink-subtle">
                ({creator.courses.length})
              </span>
            </h2>

            {creator.courses.length === 0 ? (
              <EmptyState icon={<Icon name="book" size={28} />} title={t.common.empty} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {creator.courses.map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    locale={locale}
                    t={t}
                    priority={i < 3}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            {(creator.instructorBio || profile?.bio) && (
              <Card className="p-5">
                <h2 className="mb-3 text-base">{t.courses.aboutInstructor}</h2>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                  {creator.instructorBio ?? profile?.bio}
                </p>
              </Card>
            )}

            {expertise.length > 0 && (
              <Card className="p-5">
                <h2 className="mb-3 text-base">
                  {locale === "en" ? "Expertise" : "სპეციალიზაცია"}
                </h2>
                <ul className="flex flex-wrap gap-1.5">
                  {expertise.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-surface-sunken px-2.5 py-1 text-[12px] font-medium text-ink-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="p-5">
              <p className="text-[12px] text-ink-subtle">
                {t.profile.memberSince.replace(
                  "{date}",
                  formatDate(creator.user.createdAt, locale),
                )}
              </p>
            </Card>
          </aside>
        </div>
      </div>

      <JsonLd
        data={[
          personSchema({
            displayName: creator.displayName,
            slug: creator.slug,
            bio: creator.instructorBio ?? profile?.bio ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
            locale,
            socials: socials.map((s) => s.url),
            platformName: locale === "en" ? settings.platformName : settings.platformNameKa,
          }),
          breadcrumbSchema(breadcrumbs, locale),
          itemListSchema(
            creator.courses.map((c) => ({ name: c.title, path: `/courses/${c.slug}` })),
            locale,
            `${creator.displayName} — ${t.nav.courses}`,
          ),
        ]}
      />
    </>
  );
}

function StatBlock({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[12px] text-ink-subtle">{label}</dt>
      <dd className="flex items-center gap-1.5 text-xl font-bold tabular-nums text-ink">
        {value}
        {extra}
      </dd>
    </div>
  );
}

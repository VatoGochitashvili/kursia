import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getI18n, localePath, fill } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth/session";
import { hasCourseAccess } from "@/lib/auth/rbac";
import {
  assertCourseVisible,
  getCourseBySlug,
  getCourseReviews,
  getRatingBreakdown,
  recordCourseView,
} from "@/lib/course-detail";
import { discountPercent, effectivePriceMinor, formatMoney } from "@/lib/money";
import { formatCount, formatDate, formatDuration, formatRating } from "@/lib/format";
import { paragraphsToHtml, toPlainText } from "@/lib/sanitize";
import {
  breadcrumbSchema,
  buildMetadata,
  courseSchema,
  faqSchema,
  personSchema,
  reviewSchema,
} from "@/lib/seo";
import { Curriculum } from "@/components/course/Curriculum";
import { PurchaseActions } from "@/components/course/PurchasePanel";
import { RatingSummary, ReviewList } from "@/components/course/ReviewList";
import {
  Alert, Avatar, Badge, Breadcrumbs, Card, JsonLd, Stars,
} from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * The public course page.
 *
 * Everything a buyer or a crawler needs is in the server-rendered HTML: title,
 * description, full curriculum, instructor, reviews and price. Only the buy /
 * wishlist buttons are client components. Lesson content itself is never
 * emitted here unless the lesson is a free preview.
 */

/**
 * Always rendered per request: the page reads the session (to show "you own
 * this") and records a view, so it was never actually cacheable. Declaring it
 * explicitly also keeps `notFound()` able to set a real 404 status instead of
 * a soft 404 (HTTP 200 with 404 content), which Google would index.
 */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  // Raise the 404 HERE, not in the page body. This route has a loading.tsx,
  // so the page renders inside a Suspense boundary — by the time the body runs
  // the response has begun streaming and the status can no longer be changed,
  // which would make a missing course a soft 404 (HTTP 200 with 404 content).
  // generateMetadata runs before any bytes are sent.
  if (!course) notFound();

  const { locale } = await getI18n();
  const price = effectivePriceMinor(course.priceMinor, course.discountPriceMinor);

  return buildMetadata({
    // A creator-supplied metaTitle wins; otherwise the subtitle makes the
    // SERP entry meaningfully different from the H1 alone.
    title: course.metaTitle || `${course.title}${course.subtitle ? ` — ${course.subtitle}` : ""}`,
    description:
      course.metaDescription ||
      toPlainText(course.subtitle || course.description, 160) ||
      `${course.title} — ონლაინ კურსი ${course.creator.displayName}-სგან.`,
    path: `/courses/${course.slug}`,
    locale,
    image: course.thumbnailUrl,
    type: "article",
    publishedTime: course.publishedAt,
    modifiedTime: course.updatedAt,
    // Drafts and unpublished courses stay out of the index even though the
    // owner can still open the page.
    noindex: course.status !== "PUBLISHED",
  });
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const [course, { locale, t }, settings, viewer] = await Promise.all([
    getCourseBySlug(slug),
    getI18n(),
    getSettings(),
    getSessionUser(),
  ]);

  if (!course) notFound();
  assertCourseVisible(course, viewer);

  const [access, reviews, breakdown, wishlisted] = await Promise.all([
    hasCourseAccess(viewer?.id ?? null, course.id),
    getCourseReviews(course.id, 8),
    getRatingBreakdown(course.id),
    viewer
      ? db.wishlist.count({ where: { userId: viewer.id, courseId: course.id } })
      : Promise.resolve(0),
  ]);

  // Fire-and-forget analytics — never blocks the render.
  if (course.status === "PUBLISHED") {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    void recordCourseView({
      courseId: course.id,
      userId: viewer?.id ?? null,
      ip: env.TRUST_PROXY && fwd ? fwd.split(",")[0]!.trim() : null,
      userAgent: h.get("user-agent"),
      referrer: h.get("referer"),
    });
  }

  const p = (path: string) => localePath(path, locale);
  const price = effectivePriceMinor(course.priceMinor, course.discountPriceMinor);
  const discount = discountPercent(course.priceMinor, course.discountPriceMinor);
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;
  const categoryName = course.category
    ? locale === "en" ? course.category.nameEn : course.category.nameKa
    : null;
  const levelLabel = t.courses[`level${course.level}` as keyof typeof t.courses] as string;
  const langLabel =
    (t.courses[`lang${course.language}` as keyof typeof t.courses] as string) ?? course.language;

  const videoLessons = course.modules.reduce(
    (s, m) => s + m.lessons.filter((l) => l.type === "VIDEO").length,
    0,
  );

  const includes: { icon: IconName; label: string }[] = [
    ...(videoLessons > 0
      ? [{ icon: "video" as IconName, label: fill(t.courses.includesVideo, { n: videoLessons }) }]
      : []),
    { icon: "download", label: t.courses.includesResources },
    ...(course.modules.some((m) => m.lessons.some((l) => l.type === "QUIZ"))
      ? [{ icon: "check" as IconName, label: t.courses.includesQuiz }]
      : []),
    ...(course.hasCertificate
      ? [{ icon: "award" as IconName, label: t.courses.includesCertificate }]
      : []),
    { icon: "unlock", label: t.courses.includesLifetime },
    { icon: "globe", label: t.courses.includesMobile },
  ];

  const breadcrumbs = [
    { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
    { name: t.courses.browseTitle, path: "/courses" },
    ...(course.category ? [{ name: categoryName!, path: `/category/${course.category.slug}` }] : []),
    { name: course.title, path: `/courses/${course.slug}` },
  ];

  return (
    <>
      {course.status !== "PUBLISHED" && (
        <div className="container-page pt-4">
          <Alert tone="warn" title={t.creator[`status${course.status}` as keyof typeof t.creator] as string}>
            {locale === "en"
              ? "Only you and administrators can see this page while the course is not published."
              : "სანამ კურსი გამოქვეყნებული არ არის, ამ გვერდს მხოლოდ თქვენ და ადმინისტრატორები ხედავთ."}
          </Alert>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-8 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem]">
            <div className="min-w-0">
              <Breadcrumbs
                className="mb-4 [&_*]:text-white/55 [&_a:hover]:text-white [&_span.font-medium]:text-white/90"
                items={breadcrumbs.slice(0, -1).map((b) => ({ label: b.name, href: p(b.path) }))}
              />

              <div className="mb-4 flex flex-wrap gap-2">
                {categoryName && <Badge tone="brand">{categoryName}</Badge>}
                <Badge tone="neutral">{levelLabel}</Badge>
                {discount !== null && <Badge tone="accent">−{discount}%</Badge>}
              </div>

              <h1 className="text-balance text-3xl leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
                {course.title}
              </h1>

              {course.subtitle && (
                <p className="mt-3 max-w-2xl text-pretty text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
                  {course.subtitle}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/70">
                {course.ratingCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold text-warn-500">{formatRating(course.ratingAvg)}</span>
                    <Stars rating={course.ratingAvg} size={14} />
                    <span>({formatCount(course.ratingCount, locale)})</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Icon name="users" size={14} />
                  {fill(t.courses.enrolled, { count: formatCount(course.studentCount, locale) })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="video" size={14} />
                  {fill(t.courses.lessonsCount, { count: course.lessonCount })}
                </span>
                {course.durationSeconds > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="clock" size={14} />
                    {formatDuration(course.durationSeconds, locale)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Icon name="globe" size={14} />
                  {langLabel}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Avatar
                  src={course.creator.user.profile?.avatarUrl}
                  name={course.creator.displayName}
                  size={40}
                />
                <div>
                  <p className="text-[11px] text-white/50">{t.courses.by}</p>
                  <Link
                    href={p(`/creator/${course.creator.slug}`)}
                    className="text-sm font-semibold text-white hover:underline"
                  >
                    {course.creator.displayName}
                    {course.creator.isVerified && (
                      <span className="ms-1 inline-block align-middle text-brand-300">
                        <Icon name="check" size={13} />
                      </span>
                    )}
                  </Link>
                </div>
              </div>

              {course.publishedAt && (
                <p className="mt-4 text-[12px] text-white/40">
                  {t.courses.lastUpdated} {formatDate(course.updatedAt, locale)}
                </p>
              )}
            </div>

            {/* Purchase card — sticky on desktop, inline on mobile. */}
            <div className="lg:relative">
              <Card className="overflow-hidden p-0 lg:sticky lg:top-20">
                <div className="relative aspect-video bg-surface-sunken">
                  {course.thumbnailUrl ? (
                    <Image
                      src={course.thumbnailUrl}
                      alt={course.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 24rem"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-subtle">
                      <Icon name="book" size={36} />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-bold tracking-tight text-ink">
                      {formatMoney(price, course.currency, {
                        freeLabel: t.common.free,
                        locale: locale === "en" ? "en-GB" : "ka-GE",
                        hideDecimalsWhenWhole: true,
                      })}
                    </span>
                    {discount !== null && (
                      <>
                        <span className="text-base text-ink-subtle line-through">
                          {formatMoney(course.priceMinor, course.currency, {
                            hideDecimalsWhenWhole: true,
                          })}
                        </span>
                        <Badge tone="accent">−{discount}%</Badge>
                      </>
                    )}
                  </div>

                  <div className="mt-4">
                    <PurchaseActions
                      courseId={course.id}
                      courseSlug={course.slug}
                      isAuthenticated={Boolean(viewer)}
                      isEnrolled={access.enrolled}
                      isOwnCourse={access.isOwner}
                      initiallyWishlisted={wishlisted > 0}
                      isFree={price === 0}
                      loginHref={`${p("/login")}?next=${encodeURIComponent(p(`/courses/${course.slug}`))}`}
                      learnHref={p(`/learn/${course.slug}`)}
                      labels={{
                        buyNow: t.courses.buyNow,
                        enrollFree: t.courses.enrollFree,
                        continueLearning: t.courses.continueLearning,
                        preview: t.common.open,
                        owned: t.courses.alreadyOwned,
                        addToWishlist: t.courses.addToWishlist,
                        inWishlist: t.courses.inWishlist,
                      }}
                    />
                  </div>

                  {price > 0 && settings.refundWindowDays > 0 && (
                    <p className="mt-3 text-center text-[12px] text-ink-subtle">
                      {fill(t.courses.moneyBack, { days: settings.refundWindowDays })}
                    </p>
                  )}

                  <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                    <li className="text-[13px] font-bold text-ink">{t.courses.includesTitle}</li>
                    {includes.map((item) => (
                      <li key={item.label} className="flex items-center gap-2.5 text-[13px] text-ink-muted">
                        <Icon name={item.icon} size={15} className="shrink-0 text-brand-500" />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem]">
          <div className="min-w-0 space-y-10">
            {course.outcomes.length > 0 && (
              <Section title={t.courses.whatYouLearn}>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {course.outcomes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-success-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title={t.courses.curriculum}>
              <Curriculum
                modules={course.modules}
                locale={locale}
                t={t}
                hasAccess={access.canView}
                previewHref={(lessonId) => p(`/learn/${course.slug}?lesson=${lessonId}`)}
              />
            </Section>

            {course.description && (
              <Section title={t.courses.description}>
                <div
                  className="prose-course max-w-prose"
                  // Creator-authored copy. Plain text from the builder is
                  // escaped and converted to paragraphs; no raw HTML is trusted.
                  dangerouslySetInnerHTML={{ __html: paragraphsToHtml(course.description) }}
                />
              </Section>
            )}

            {course.requirementList.length > 0 && (
              <Section title={t.courses.requirements}>
                <ul className="space-y-2">
                  {course.requirementList.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-subtle" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {course.audienceList.length > 0 && (
              <Section title={t.courses.targetAudience}>
                <ul className="space-y-2">
                  {course.audienceList.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                      <Icon name="user" size={15} className="mt-0.5 shrink-0 text-brand-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title={t.courses.aboutInstructor}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar
                    src={course.creator.user.profile?.avatarUrl}
                    name={course.creator.displayName}
                    size={64}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={p(`/creator/${course.creator.slug}`)}
                      className="text-lg font-bold text-ink hover:text-brand-600 hover:underline"
                    >
                      {course.creator.displayName}
                    </Link>
                    {course.creator.user.profile?.headline && (
                      <p className="mt-0.5 text-[13px] text-ink-muted">
                        {course.creator.user.profile.headline}
                      </p>
                    )}

                    <dl className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                      <StatPair
                        label={t.creator.averageRating}
                        value={course.creatorStats.ratingAvg > 0 ? course.creatorStats.ratingAvg.toFixed(1) : "—"}
                      />
                      <StatPair
                        label={t.common.reviews}
                        value={formatCount(course.creatorStats.ratingCount, locale)}
                      />
                      <StatPair
                        label={t.common.students}
                        value={formatCount(course.creatorStats.studentCount, locale)}
                      />
                      <StatPair label={t.nav.courses} value={String(course.creatorStats.courseCount)} />
                    </dl>

                    {course.creator.instructorBio && (
                      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                        {course.creator.instructorBio}
                      </p>
                    )}

                    {course.expertiseList.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {course.expertiseList.map((tag) => (
                          <li
                            key={tag}
                            className="rounded-full bg-surface-sunken px-2.5 py-1 text-[11px] font-medium text-ink-muted"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            </Section>

            <Section title={t.courses.reviewsTitle}>
              {breakdown.total > 0 && (
                <div className="mb-7">
                  <RatingSummary
                    average={course.ratingAvg}
                    total={breakdown.total}
                    breakdown={breakdown.counts}
                    locale={locale}
                    t={t}
                  />
                </div>
              )}
              <ReviewList reviews={reviews} locale={locale} t={t} />
              {access.enrolled && (
                <p className="mt-5 text-[13px] text-ink-muted">
                  <Link href={p(`/learn/${course.slug}`)} className="font-semibold text-brand-600 hover:underline">
                    {t.reviews.writeReview} →
                  </Link>
                </p>
              )}
            </Section>

            {course.faqs.length > 0 && (
              <Section title={t.courses.faqTitle}>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {course.faqs.map((faq) => (
                    <details key={faq.id} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-semibold text-ink">
                        {faq.question}
                        <Icon
                          name="chevronDown"
                          size={17}
                          className="shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <div aria-hidden="true" className="hidden lg:block" />
        </div>
      </div>

      <JsonLd
        data={[
          courseSchema({
            title: course.title,
            description: course.description ?? course.subtitle ?? course.title,
            slug: course.slug,
            locale,
            language: course.language,
            level: levelLabel,
            thumbnailUrl: course.thumbnailUrl,
            priceMinor: price,
            currency: course.currency,
            ratingAvg: course.ratingAvg,
            ratingCount: course.ratingCount,
            studentCount: course.studentCount,
            lessonCount: course.lessonCount,
            durationSeconds: course.durationSeconds,
            publishedAt: course.publishedAt,
            updatedAt: course.updatedAt,
            creator: { displayName: course.creator.displayName, slug: course.creator.slug },
            platformName: brand,
          }),
          breadcrumbSchema(breadcrumbs, locale),
          ...reviewSchema(
            reviews.slice(0, 5).map((r) => ({
              rating: r.rating,
              body: r.body,
              author: r.user.profile?.fullName ?? "—",
              createdAt: r.createdAt,
            })),
          ),
          ...(faqSchema(course.faqs) ? [faqSchema(course.faqs)!] : []),
        ]}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xl sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-subtle">{label}</dt>
      <dd className="font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

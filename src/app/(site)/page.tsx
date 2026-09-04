import Link from "next/link";
import type { Metadata } from "next";
import { getI18n, localePath, fill } from "@/i18n";
import { getSettings } from "@/lib/settings";
import {
  getCategoryTree,
  getFeaturedCourses,
  getNewCourses,
  getPlatformStats,
  getPopularCourses,
  getPopularCreators,
} from "@/lib/courses";
import { buildMetadata, itemListSchema } from "@/lib/seo";
import { formatCount } from "@/lib/format";
import { CourseCard } from "@/components/course/CourseCard";
import { CreatorCard } from "@/components/course/CreatorCard";
import { SearchBar } from "@/components/layout/SearchBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card, JsonLd, SectionHeading, Stars } from "@/components/ui/primitives";
import { Icon, categoryIcon, type IconName } from "@/components/ui/Icon";

/**
 * The homepage is fully server-rendered from the database and revalidated
 * periodically, so Google sees real course content and the page costs one
 * cached render rather than a query storm per visitor.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;
  return buildMetadata({
    title: `${brand} — ${locale === "en" ? settings.taglineEn : settings.seoDefaultTitleKa}`,
    description: settings.seoDefaultDescriptionKa,
    path: "/",
    locale,
  });
}

export default async function HomePage() {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);

  const [stats, categories, featured, popular, newest, creators] = await Promise.all([
    getPlatformStats(),
    getCategoryTree(),
    getFeaturedCourses(8, settings.featuredCourseIds),
    getPopularCourses(8),
    getNewCourses(8),
    getPopularCreators(6, settings.featuredCreatorIds),
  ]);

  const p = (path: string) => localePath(path, locale);
  const catName = (c: { nameKa: string; nameEn: string }) => (locale === "en" ? c.nameEn : c.nameKa);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line bg-surface">
        {/* Soft brand wash — decorative only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70rem 32rem at 15% -12%, rgb(53 89 240 / 0.10), transparent 60%)," +
              "radial-gradient(48rem 26rem at 92% 8%, rgb(255 87 16 / 0.07), transparent 62%)",
          }}
        />

        <div className="container-page py-16 sm:py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-fade-up">
              <p className="eyebrow mb-4">{t.home.heroEyebrow}</p>

              <h1 className="text-balance text-[2.5rem] leading-[1.08] sm:text-6xl lg:text-[4.25rem]">
                <span className="block">{t.home.heroTitleLine1}</span>
                <span className="block">{t.home.heroTitleLine2}</span>
                <span className="block bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                  {t.home.heroTitleLine3}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:text-[17px]">
                {t.home.heroSubtitle}
              </p>

              <div className="mt-8 max-w-xl">
                <SearchBar
                  placeholder={t.home.heroSearchPlaceholder}
                  action={p("/courses")}
                  size="lg"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href={p("/courses")} size="lg">
                  {t.home.heroPrimaryCta}
                  <Icon name="arrowRight" size={17} />
                </ButtonLink>
                <ButtonLink href={p("/become-instructor")} variant="outline" size="lg">
                  {t.home.heroSecondaryCta}
                </ButtonLink>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <HeroStat value={formatCount(stats.courses, locale)} label={t.home.statCourses} />
                <HeroStat value={formatCount(stats.students, locale)} label={t.home.statStudents} />
                <HeroStat value={formatCount(stats.creators, locale)} label={t.home.statCreators} />
                <HeroStat
                  value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
                  label={t.home.statRating}
                  extra={stats.averageRating > 0 ? <Stars rating={stats.averageRating} size={11} /> : null}
                />
              </dl>
            </div>

            {/* Live catalogue preview — real courses, not a stock illustration. */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-100/60 to-accent-50/60 blur-2xl" />
              <div className="grid gap-4 sm:grid-cols-2">
                {featured.slice(0, 4).map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    locale={locale}
                    t={t}
                    priority={i < 2}
                    className={i % 2 === 1 ? "mt-8" : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <Section>
        <SectionHeading
          eyebrow={t.nav.categories}
          title={t.home.categoriesTitle}
          subtitle={t.home.categoriesSubtitle}
          action={
            <Link
              href={p("/categories")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
            >
              {t.common.seeAll}
              <Icon name="arrowRight" size={15} />
            </Link>
          }
        />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {categories.slice(0, 14).map((c) => (
            <li key={c.slug}>
              <CategoryTile
                href={p(`/category/${c.slug}`)}
                name={catName(c)}
                icon={categoryIcon(c.icon)}
                color={c.colorHex}
                count={c.courseCount}
                countLabel={t.nav.courses}
              />
            </li>
          ))}
        </ul>
      </Section>

      {/* ── Featured ─────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <Section muted>
          <SectionHeading
            eyebrow={t.common.featured}
            title={t.home.featuredTitle}
            subtitle={t.home.featuredSubtitle}
            action={<SeeAllLink href={p("/courses")} label={t.common.seeAll} />}
          />
          <CourseGrid courses={featured} locale={locale} t={t} />
        </Section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <Section>
        <SectionHeading title={t.home.howItWorksTitle} subtitle={t.home.howItWorksSubtitle} />
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            { n: "1", title: t.home.step1Title, body: t.home.step1Body, icon: "search" as IconName },
            { n: "2", title: t.home.step2Title, body: t.home.step2Body, icon: "creditCard" as IconName },
            { n: "3", title: t.home.step3Title, body: t.home.step3Body, icon: "award" as IconName },
          ].map((step) => (
            <li key={step.n}>
              <Card className="relative h-full p-6">
                <span className="absolute right-5 top-5 text-5xl font-black leading-none text-surface-sunken">
                  {step.n}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={step.icon} size={21} />
                </span>
                <h3 className="mt-4 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Popular ──────────────────────────────────────────────────────── */}
      {popular.length > 0 && (
        <Section muted>
          <SectionHeading
            eyebrow={t.common.popular}
            title={t.home.popularTitle}
            subtitle={t.home.popularSubtitle}
            action={<SeeAllLink href={`${p("/courses")}?sort=popular`} label={t.common.seeAll} />}
          />
          {/* A scroll-snap rail on mobile beats a JS carousel: no bundle, and
              it respects native momentum scrolling. */}
          <div className="rail md:hidden">
            {popular.map((c) => (
              <CourseCard key={c.id} course={c} locale={locale} t={t} variant="rail" />
            ))}
          </div>
          <div className="hidden md:block">
            <CourseGrid courses={popular} locale={locale} t={t} />
          </div>
        </Section>
      )}

      {/* ── Student benefits ─────────────────────────────────────────────── */}
      <Section>
        <SectionHeading title={t.home.studentBenefitsTitle} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "globe" as IconName, title: t.home.studentBenefit1Title, body: t.home.studentBenefit1Body },
            { icon: "unlock" as IconName, title: t.home.studentBenefit2Title, body: t.home.studentBenefit2Body },
            { icon: "video" as IconName, title: t.home.studentBenefit3Title, body: t.home.studentBenefit3Body },
            { icon: "award" as IconName, title: t.home.studentBenefit4Title, body: t.home.studentBenefit4Body },
          ].map((b) => (
            <li key={b.title}>
              <Card className="h-full p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 text-success-700">
                  <Icon name={b.icon} size={19} />
                </span>
                <h3 className="mt-3.5 text-[15px]">{b.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{b.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── New courses ──────────────────────────────────────────────────── */}
      {newest.length > 0 && (
        <Section muted>
          <SectionHeading
            eyebrow={t.common.new}
            title={t.home.newTitle}
            subtitle={t.home.newSubtitle}
            action={<SeeAllLink href={`${p("/courses")}?sort=newest`} label={t.common.seeAll} />}
          />
          <CourseGrid courses={newest} locale={locale} t={t} />
        </Section>
      )}

      {/* ── Creators ─────────────────────────────────────────────────────── */}
      {creators.length > 0 && (
        <Section>
          <SectionHeading
            eyebrow={t.nav.creators}
            title={t.home.creatorsTitle}
            subtitle={t.home.creatorsSubtitle}
            action={<SeeAllLink href={p("/instructors")} label={t.common.seeAll} />}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {creators.map((c) => (
              <CreatorCard key={c.id} creator={c} locale={locale} t={t} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Creator benefits ─────────────────────────────────────────────── */}
      <Section muted>
        <SectionHeading title={t.home.creatorBenefitsTitle} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "wallet" as IconName, title: t.home.creatorBenefit1Title, body: t.home.creatorBenefit1Body },
            { icon: "video" as IconName, title: t.home.creatorBenefit2Title, body: t.home.creatorBenefit2Body },
            { icon: "chart" as IconName, title: t.home.creatorBenefit3Title, body: t.home.creatorBenefit3Body },
            { icon: "bank" as IconName, title: t.home.creatorBenefit4Title, body: t.home.creatorBenefit4Body },
          ].map((b) => (
            <li key={b.title}>
              <Card className="h-full p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={b.icon} size={19} />
                </span>
                <h3 className="mt-3.5 text-[15px]">{b.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{b.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <Testimonials locale={locale} t={t} />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <HomeFaq t={t} settings={{ refundWindowDays: settings.refundWindowDays }} />

      {/* ── Creator CTA ──────────────────────────────────────────────────── */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-center sm:px-14 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(40rem 22rem at 20% 0%, rgb(53 89 240 / 0.45), transparent 60%)," +
                "radial-gradient(34rem 20rem at 85% 100%, rgb(255 87 16 / 0.32), transparent 62%)",
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-balance text-3xl text-white sm:text-4xl">{t.home.creatorCtaTitle}</h2>
            <p className="mt-4 text-pretty text-[15px] leading-relaxed text-white/70 sm:text-base">
              {t.home.creatorCtaBody}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={p("/register?type=creator")} size="lg" className="bg-white text-ink hover:bg-white/90">
                {t.home.creatorCtaButton}
                <Icon name="arrowRight" size={17} />
              </ButtonLink>
              <ButtonLink
                href={p("/become-instructor")}
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                {t.common.showMore}
              </ButtonLink>
            </div>
            <p className="mt-5 text-[13px] text-white/50">{t.home.creatorCtaNote}</p>
          </div>
        </div>
      </section>

      <JsonLd
        data={itemListSchema(
          featured.map((c) => ({ name: c.title, path: `/courses/${c.slug}` })),
          locale,
          t.home.featuredTitle,
        )}
      />
    </>
  );
}

// ── Local building blocks ──────────────────────────────────────────────────

function Section({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <section className={muted ? "border-y border-line bg-surface-muted" : ""}>
      <div className="container-page py-14 sm:py-16">{children}</div>
    </section>
  );
}

function CourseGrid({
  courses,
  locale,
  t,
}: {
  courses: Awaited<ReturnType<typeof getPopularCourses>>;
  locale: Parameters<typeof CourseCard>[0]["locale"];
  t: Parameters<typeof CourseCard>[0]["t"];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} locale={locale} t={t} />
      ))}
    </div>
  );
}

function HeroStat({
  value,
  label,
  extra,
}: {
  value: string;
  label: string;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="order-2 text-[13px] text-ink-muted">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums tracking-tight text-ink sm:text-3xl">
        {value}
        {extra && <span className="ms-1 inline-block align-middle">{extra}</span>}
      </dd>
    </div>
  );
}

function CategoryTile({
  href,
  name,
  icon,
  color,
  count,
  countLabel,
}: {
  href: string;
  name: string;
  icon: IconName;
  color: string | null;
  count: number;
  countLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{
          backgroundColor: `${color ?? "#3559f0"}15`,
          color: color ?? "#3559f0",
        }}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="text-[13px] font-semibold leading-tight text-ink">{name}</span>
      <span className="text-[11px] text-ink-subtle">
        {count} {countLabel}
      </span>
    </Link>
  );
}

function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
    >
      {label}
      <Icon name="arrowRight" size={15} />
    </Link>
  );
}

function Testimonials({
  locale,
  t,
}: {
  locale: Parameters<typeof CourseCard>[0]["locale"];
  t: Parameters<typeof CourseCard>[0]["t"];
}) {
  // Illustrative quotes for the launch page. Once real reviews exist, an
  // admin can promote genuine ones here from Admin → Homepage.
  const quotes =
    locale === "en"
      ? [
          { body: "I found the first course in Georgian that actually goes deep. I applied it at work in the first week.", name: "Mariam K.", role: "Marketing specialist" },
          { body: "Payment in GEL with a local card, no foreign transaction fuss. Access opened instantly.", name: "Luka G.", role: "Student" },
          { body: "I published my first course in a weekend. I can see every sale and my balance in real time.", name: "Nino B.", role: "Instructor" },
        ]
      : [
          { body: "პირველად ვიპოვე ქართული კურსი, რომელიც მართლა ღრმად შედის თემაში. პირველივე კვირაში გამოვიყენე სამსახურში.", name: "მარიამ ქ.", role: "მარკეტინგის სპეციალისტი" },
          { body: "გადავიხადე ქართული ბარათით, ლარში — უცხოური გადარიცხვების თავსატეხის გარეშე. წვდომა მაშინვე გაიხსნა.", name: "ლუკა გ.", role: "სტუდენტი" },
          { body: "პირველი კურსი ერთ შაბათ-კვირაში გამოვაქვეყნე. ყოველ გაყიდვას და ბალანსს რეალურ დროში ვხედავ.", name: "ნინო ბ.", role: "ინსტრუქტორი" },
        ];

  return (
    <Section>
      <SectionHeading title={t.home.testimonialsTitle} subtitle={t.home.testimonialsSubtitle} />
      <ul className="grid gap-4 md:grid-cols-3">
        {quotes.map((q) => (
          <li key={q.name}>
            <Card className="flex h-full flex-col p-6">
              <Stars rating={5} size={15} />
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink">
                „{q.body}"
              </blockquote>
              <footer className="mt-5 border-t border-line pt-4">
                <p className="text-sm font-semibold text-ink">{q.name}</p>
                <p className="text-[12px] text-ink-subtle">{q.role}</p>
              </footer>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function HomeFaq({
  t,
  settings,
}: {
  t: Parameters<typeof CourseCard>[0]["t"];
  settings: { refundWindowDays: number };
}) {
  const faqs = [
    {
      q: "როგორ ვიხდი კურსში?",
      a: "გადახდა ხდება ქართული ბარათით, ლარში. მხარდაჭერილია საქართველოს ბანკისა და თიბისის საგადახდო სისტემები, ასევე საბანკო გადარიცხვა. კურსზე წვდომა იხსნება მხოლოდ ბანკის მიერ გადახდის დადასტურების შემდეგ.",
    },
    {
      q: "რამდენ ხანს მაქვს კურსზე წვდომა?",
      a: "სამუდამოდ. ერთხელ შეძენილი კურსი და მისი ყველა მომავალი განახლება თქვენს ანგარიშში რჩება.",
    },
    {
      q: "შემიძლია თანხის დაბრუნება?",
      a: `დიახ. თუ კურსი არ დაგაკმაყოფილათ, თანხის დაბრუნება შესაძლებელია შეძენიდან ${settings.refundWindowDays} დღის განმავლობაში.`,
    },
    {
      q: "მივიღებ სერტიფიკატს?",
      a: "დიახ. კურსის 100%-ით დასრულების შემდეგ ავტომატურად გაიცემა სერტიფიკატი უნიკალური ID-ით. მისი ნამდვილობის შემოწმება ნებისმიერს შეუძლია საჯარო გვერდზე.",
    },
    {
      q: "როგორ გავხდე ინსტრუქტორი?",
      a: "დარეგისტრირდით ინსტრუქტორად, შექმენით კურსი კონსტრუქტორში და გაგზავნეთ განხილვაზე. დამტკიცების შემდეგ კურსი გამოქვეყნდება და გაყიდვები დაიწყება. საკომისიო იჭრება მხოლოდ რეალური გაყიდვისას.",
    },
    {
      q: "როდის მივიღებ გამომუშავებულ თანხას?",
      a: "გაყიდვის თანხა ჯერ მოლოდინის რეჟიმში ხვდება (დაბრუნების ვადის გასვლამდე), შემდეგ ხდება ხელმისაწვდომი გასატანად. გატანა ხდება ქართულ საბანკო ანგარიშზე.",
    },
  ];

  return (
    <Section muted>
      <SectionHeading title={t.home.faqTitle} subtitle={t.home.faqSubtitle} />
      <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {faqs.map((f) => (
          <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-semibold text-ink">
              {f.q}
              <Icon
                name="chevronDown"
                size={18}
                className="shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

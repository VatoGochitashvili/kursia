import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/enums";
import { getI18n, localePath, fill, type Dictionary } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { listCommunities, listCommunityCategories } from "@/lib/communities";
import { buildMetadata, itemListSchema } from "@/lib/seo";
import { bpsToPercent } from "@/lib/money";
import { CommunityCard } from "@/components/community/CommunityCard";
import { ButtonLink } from "@/components/ui/Button";
import {
  Card,
  JsonLd,
  SectionHeading,
  Stars,
} from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Stagger } from "@/components/ui/Stagger";

/**
 * The homepage is fully server-rendered from the database and revalidated
 * periodically, so Google sees the real circles and the page costs one
 * cached render rather than a query storm per visitor.
 *
 * Structure follows the two things a two-sided marketplace has to do on one
 * screen: let a visitor find a programme (search, category chips, real cards
 * above the fold) and let a creator see why they would sell here (the dark
 * earnings band). Everything between those two is supporting evidence.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, settings] = await Promise.all([getI18n(), getSettings()]);
  const brand =
    locale === "en" ? settings.platformName : settings.platformNameKa;
  return buildMetadata({
    title: `${brand} — ${locale === "en" ? settings.taglineEn : settings.seoDefaultTitleKa}`,
    description: settings.seoDefaultDescriptionKa,
    path: "/",
    locale,
    // The homepage title already opens with the brand name.
    titleIsAbsolute: true,
  });
}

export default async function HomePage() {
  const [{ locale, t }, settings] = await Promise.all([
    getI18n(),
    getSettings(),
  ]);

  const [communities, communityCategories] = await Promise.all([
    listCommunities({ locale, take: 9 }),
    listCommunityCategories(locale),
  ]);

  const p = (path: string) => localePath(path, locale);
  const creatorShare = String(100 - bpsToPercent(settings.commissionBps));

  return (
    <>
      {/* ── Discovery ──────────────────────────────────────────────────── */}
      {/* The landing is the directory. No headline to read past and no search
          box to fill in first: the categories, then the circles themselves,
          which is what anyone arriving here came to look at. */}
      <section className="container-page pb-12 pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[1.75rem]/[1.25] font-bold tracking-tight sm:text-[2.1rem]/[1.2]">
              {t.communities.title}
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-muted sm:text-[15px]">
              {t.communities.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SeeAllLink href={p("/communities")} label={t.common.seeAll} />
          </div>
        </div>

        {communityCategories.length > 0 && (
          <nav
            aria-label={t.nav.categories}
            className="mt-5 flex flex-wrap gap-2"
          >
            <Link
              href={p("/communities")}
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white"
            >
              {t.communities.all}
            </Link>
            {communityCategories.map((c) => (
              <Link
                key={c.slug}
                href={p(`/communities?category=${c.slug}`)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink-muted transition-colors hover:border-brand-300 hover:text-ink"
              >
                {c.name}
                <span className="text-[11px] tabular-nums opacity-60">
                  {c.count}
                </span>
              </Link>
            ))}
          </nav>
        )}

        {communities.length > 0 ? (
          <Stagger className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community, index) => (
              <CommunityCard
                key={community.creatorId}
                community={community}
                href={p(`/community/${community.slug}`)}
                priority={index < 3}
                t={t}
              />
            ))}
          </Stagger>
        ) : (
          <Card className="mt-6 p-10 text-center">
            <p className="text-[15px] font-semibold">{t.communities.noneYet}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-ink-muted">
              {t.communities.noneYetBody}
            </p>
          </Card>
        )}
      </section>

      {/* ── Who this is for ──────────────────────────────────────────────── */}
      {/* The positioning statement. Everything else on the page is a
          marketplace; this is the one block that says which marketplace. */}
      <Section>
        <SectionHeading
          title={t.home.audienceTitle}
          subtitle={t.home.audienceSubtitle}
        />
        <Stagger
          as="ul"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          step={80}
        >
          {[
            {
              icon: "dumbbell" as IconName,
              title: t.home.audience1Title,
              body: t.home.audience1Body,
              tint: "#f03c06",
            },
            {
              icon: "leaf" as IconName,
              title: t.home.audience2Title,
              body: t.home.audience2Body,
              tint: "#12b76a",
            },
            {
              icon: "camera" as IconName,
              title: t.home.audience3Title,
              body: t.home.audience3Body,
              tint: "#3559f0",
            },
            {
              icon: "target" as IconName,
              title: t.home.audience4Title,
              body: t.home.audience4Body,
              tint: "#9333ea",
            },
          ].map((a) => (
            <li key={a.title}>
              <AudienceCard {...a} />
            </li>
          ))}
        </Stagger>
      </Section>

      {/* ── Creator earnings ─────────────────────────────────────────────── */}
      <EarningsBand
        t={t}
        share={creatorShare}
      />

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <Section muted>
        <SectionHeading
          title={t.home.howItWorksTitle}
          subtitle={t.home.howItWorksSubtitle}
        />
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            {
              n: "1",
              title: t.home.step1Title,
              body: t.home.step1Body,
              icon: "search" as IconName,
            },
            {
              n: "2",
              title: t.home.step2Title,
              body: t.home.step2Body,
              icon: "creditCard" as IconName,
            },
            {
              n: "3",
              title: t.home.step3Title,
              body: t.home.step3Body,
              icon: "award" as IconName,
            },
          ].map((step) => (
            <li key={step.n}>
              <Card className="group relative h-full overflow-hidden p-6 transition-shadow duration-300 hover:shadow-lg">
                <span className="pointer-events-none absolute -right-2 top-1 text-[5.5rem] font-black leading-none text-surface-sunken transition-transform duration-500 group-hover:-translate-y-1">
                  {step.n}
                </span>
                <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={step.icon} size={21} />
                </span>
                <h3 className="relative mt-4 text-lg">{step.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Member benefits ──────────────────────────────────────────────── */}
      <Section>
        <SectionHeading title={t.home.studentBenefitsTitle} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "globe" as IconName,
              title: t.home.studentBenefit1Title,
              body: t.home.studentBenefit1Body,
            },
            {
              icon: "unlock" as IconName,
              title: t.home.studentBenefit2Title,
              body: t.home.studentBenefit2Body,
            },
            {
              icon: "video" as IconName,
              title: t.home.studentBenefit3Title,
              body: t.home.studentBenefit3Body,
            },
            {
              icon: "award" as IconName,
              title: t.home.studentBenefit4Title,
              body: t.home.studentBenefit4Body,
            },
          ].map((b) => (
            <li key={b.title}>
              <Card className="h-full p-5 transition-all duration-300 hover:-translate-y-1 hover:border-success-500/30 hover:shadow-lg">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 text-success-700">
                  <Icon name={b.icon} size={19} />
                </span>
                <h3 className="mt-3.5 text-[15px]">{b.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                  {b.body}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <Testimonials locale={locale} t={t} />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <HomeFaq
        locale={locale}
        t={t}
        settings={{ refundWindowDays: settings.refundWindowDays }}
      />

      <JsonLd
        data={itemListSchema(
          communities.map((c) => ({
            name: c.name,
            path: `/community/${c.slug}`,
          })),
          locale,
          t.communities.title,
        )}
      />
    </>
  );
}

// ── Local building blocks ──────────────────────────────────────────────────

function Section({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    // Muted bands are translucent so the ambient backdrop still reads through
    // them; fully opaque, they cut the page into stripes of texture and blank.
    <section
      className={muted ? "border-y border-line bg-surface-muted/75" : ""}
    >
      <div className="container-page py-14 sm:py-16">
        <Reveal>{children}</Reveal>
      </div>
    </section>
  );
}

function CategoryChip({
  href,
  name,
  icon,
  color,
}: {
  href: string;
  name: string;
  icon: IconName;
  color: string | null;
}) {
  const tint = color ?? "#3559f0";
  return (
    <Link
      href={href}
      className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface ps-2 pe-4 text-[13px] font-semibold text-ink shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: `${tint}26` }}
    >
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${tint}1a`, color: tint }}
      >
        <Icon name={icon} size={13} />
      </span>
      {name}
    </Link>
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
  const tint = color ?? "#3559f0";
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-line bg-surface p-4 text-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift"
    >
      {/* A wash of the category's own colour rises on hover. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0 opacity-0 transition-all duration-300 group-hover:h-full group-hover:opacity-100"
        style={{
          background: `linear-gradient(to top, ${tint}14, transparent)`,
        }}
      />
      <span
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110"
        style={{ backgroundColor: `${tint}15`, color: tint }}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="relative text-[13px] font-semibold leading-tight text-ink">
        {name}
      </span>
      <span className="relative text-[11px] text-ink-subtle">
        {count} {countLabel}
      </span>
    </Link>
  );
}

/** One of the four professions the marketplace is positioned around. */
function AudienceCard({
  icon,
  title,
  body,
  tint,
}: {
  icon: IconName;
  title: string;
  body: string;
  tint: string;
}) {
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-lift-lg">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ backgroundColor: tint }}
      />
      <span
        aria-hidden="true"
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: `${tint}40` }}
      />
      <span
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${tint}14`, color: tint }}
      >
        <Icon name={icon} size={23} />
      </span>
      <h3 className="relative mt-4 text-[17px]">{title}</h3>
      <p className="relative mt-2 text-[14px] leading-relaxed text-ink-muted">
        {body}
      </p>
    </div>
  );
}

/**
 * The creator side of the marketplace, stated in one dark band.
 *
 * The commission is read from platform settings rather than written into the
 * copy, so an administrator who changes the rate cannot leave the homepage
 * advertising a split the platform no longer honours.
 */
function EarningsBand({
  t,
  share,
}: {
  t: Dictionary;
  share: string;
}) {
  const points = [
    {
      icon: "wallet" as IconName,
      title: fill(t.home.earningsPoint1Title, { share }),
      body: t.home.earningsPoint1Body,
    },
    {
      icon: "creditCard" as IconName,
      title: t.home.earningsPoint2Title,
      body: t.home.earningsPoint2Body,
    },
    {
      icon: "layers" as IconName,
      title: t.home.earningsPoint3Title,
      body: t.home.earningsPoint3Body,
    },
  ];

  return (
    <section className="grain relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45rem 26rem at 15% 0%, rgb(53 89 240 / 0.42), transparent 62%)," +
            "radial-gradient(38rem 22rem at 88% 100%, rgb(255 87 16 / 0.34), transparent 64%)," +
            "radial-gradient(30rem 18rem at 55% 120%, rgb(124 58 237 / 0.30), transparent 66%)",
        }}
      />
      {/* Slow drift, so the band is never quite the same twice. */}
      <div
        aria-hidden="true"
        className="aurora pointer-events-none absolute -left-32 top-1/4 h-[34rem] w-[34rem] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgb(53 89 240 / 0.35), transparent 62%)",
          animationDuration: "28s",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px)," +
            "linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container-page relative py-16 sm:py-20">
        <Reveal>
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-accent-300">
                {t.home.earningsEyebrow}
              </p>
              <h2 className="mt-4 text-balance text-3xl text-white sm:text-[2.75rem]/[1.18]">
                {t.home.earningsTitle}
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-white/70 sm:text-base">
                {fill(t.home.earningsBody, { share })}
              </p>

            </div>

            <div>
              {/* The number does the arguing. */}
              <div className="relative rounded-3xl border border-white/[0.12] bg-white/[0.06] p-6 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.10)] backdrop-blur-md sm:p-8">
                <p className="flex items-baseline gap-1 text-6xl font-black tracking-tight text-white sm:text-7xl">
                  {share}
                  <span className="text-3xl sm:text-4xl">%</span>
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {t.home.earningsPoint1Body}
                </p>

                <ul className="mt-7 space-y-5 border-t border-white/10 pt-6">
                  {points.map((point) => (
                    <li key={point.title} className="flex gap-3.5">
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                        <Icon name={point.icon} size={18} />
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold text-white">
                          {point.title}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-white/60">
                          {point.body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
    >
      {label}
      <Icon
        name="arrowRight"
        size={15}
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function Testimonials({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  // Illustrative quotes for the launch page. Once real reviews exist, an
  // admin can promote genuine ones here from Admin → Homepage.
  const quotes =
    locale === "en"
      ? [
          {
            body: "Twelve weeks of training I could actually follow from home, in Georgian, without guessing at the technique.",
            name: "Mariam K.",
            role: "Student",
          },
          {
            body: "I coach eleven people in the gym. The programme I published here now reaches four hundred.",
            name: "Nika C.",
            role: "Personal trainer",
          },
          {
            body: "I had the audience for years and no way to sell to it in GEL. I launched my first product in a weekend.",
            name: "Saba L.",
            role: "Content creator",
          },
        ]
      : [
          {
            body: "12 კვირა ვარჯიში, რომელსაც სახლიდან, ქართულად და ტექნიკის გამოცნობის გარეშე მივყევი.",
            name: "მარიამ ქ.",
            role: "სტუდენტი",
          },
          {
            body: "დარბაზში თერთმეტ ადამიანს ვამზადებ. აქ გამოქვეყნებული პროგრამა უკვე ოთხასს სწვდება.",
            name: "ნიკა ჩ.",
            role: "პერსონალური მწვრთნელი",
          },
          {
            body: "აუდიტორია წლებია მყავს, ლარში გაყიდვის გზა კი — არა. პირველი პროდუქტი ერთ შაბათ-კვირაში გავუშვი.",
            name: "საბა ლ.",
            role: "კონტენტ-კრეატორი",
          },
        ];

  return (
    <Section muted>
      <SectionHeading
        title={t.home.testimonialsTitle}
        subtitle={t.home.testimonialsSubtitle}
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {quotes.map((q) => (
          <li key={q.name}>
            <Card className="flex h-full flex-col p-6 transition-shadow duration-300 hover:shadow-lg">
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
  locale,
  t,
  settings,
}: {
  locale: Locale;
  t: Dictionary;
  settings: { refundWindowDays: number };
}) {
  // These were Georgian-only, which meant the English homepage rendered a
  // Georgian FAQ. They live here rather than in the dictionaries because one
  // answer interpolates a platform setting.
  const en = locale === "en";
  const faqs = [
    {
      q: en ? "How do I pay for a lesson?" : "როგორ ვიხდი გაკვეთილში?",
      a: en
        ? "With a Georgian card, in GEL. Bank of Georgia and TBC payment systems are supported, as well as bank transfer. Access opens only once the bank confirms the payment."
        : "გადახდა ხდება ქართული ბარათით, ლარში. მხარდაჭერილია საქართველოს ბანკისა და თიბისის საგადახდო სისტემები, ასევე საბანკო გადარიცხვა. გაკვეთილზე წვდომა იხსნება მხოლოდ ბანკის მიერ გადახდის დადასტურების შემდეგ.",
    },
    {
      q: en ? "How long do I have access?" : "რამდენ ხანს მაქვს წვდომა?",
      a: en
        ? "Forever. Once bought, the lesson and every future update to it stay in your account."
        : "სამუდამოდ. ერთხელ შეძენილი გაკვეთილი და მისი ყველა მომავალი განახლება თქვენს ანგარიშში რჩება.",
    },
    {
      q: en ? "Can I get a refund?" : "შემიძლია თანხის დაბრუნება?",
      a: en
        ? `Yes. If a membership is not what you expected, you can request a refund within ${settings.refundWindowDays} days of purchase.`
        : `დიახ. თუ გაკვეთილი არ დაგაკმაყოფილათ, თანხის დაბრუნება შესაძლებელია შეძენიდან ${settings.refundWindowDays} დღის განმავლობაში.`,
    },
    {
      q: en
        ? "Can I follow a lesson on my phone?"
        : "შემიძლია გაკვეთილის გავლა ტელეფონიდან?",
      a: en
        ? "Yes. The whole platform works on a phone, which is where most people actually train. Your progress syncs, so you can start a lesson on a laptop and finish it at the gym."
        : "დიახ. პლატფორმა სრულად მუშაობს ტელეფონზე — სწორედ იქიდან ვარჯიშობს ხალხის უმეტესობა. პროგრესი ინახება, ასე რომ ვიდეო კომპიუტერზე დაიწყე და დარბაზში დაასრულე.",
    },
    {
      q: en
        ? "I am a trainer with in-person clients. What does the platform give me?"
        : "მწვრთნელი ვარ და კლიენტები ცოცხლად მყავს — რას მაძლევს პლატფორმა?",
      a: en
        ? "The ability to sell one recorded programme over and over, without spending more of your time. Video, quizzes, progress tracking and payment are already built; you only bring the content."
        : "შესაძლებლობას, რომ ერთხელ ჩაწერილი პროგრამა უსასრულოდ გაიყიდოს — შენი დროის დამატებითი დახარჯვის გარეშე. ვიდეო, ქვიზები, პროგრესის თვალყური და გადახდა უკვე აწყობილია; შენ მხოლოდ შინაარსი შემოგაქვს.",
    },
    {
      q: en ? "How do I become a creator?" : "როგორ გავხდე კრეატორი?",
      a: en
        ? "Sign up as a creator, build a lesson in the builder and submit it for review. Once approved it is published and can sell. Commission is charged only on an actual sale."
        : "დარეგისტრირდი კრეატორად, შექმენი გაკვეთილი კონსტრუქტორში და გააგზავნე განხილვაზე. დამტკიცების შემდეგ ის გამოქვეყნდება და გაყიდვები დაიწყება. საკომისიო იჭრება მხოლოდ რეალური გაყიდვისას.",
    },
    {
      q: en
        ? "When do I receive my earnings?"
        : "როდის მივიღებ გამომუშავებულ თანხას?",
      a: en
        ? "A sale is held pending until the refund window closes, then becomes available to withdraw. Payouts go to a Georgian bank account."
        : "გაყიდვის თანხა ჯერ მოლოდინის რეჟიმში ხვდება (დაბრუნების ვადის გასვლამდე), შემდეგ ხდება ხელმისაწვდომი გასატანად. გატანა ხდება ქართულ საბანკო ანგარიშზე.",
    },
  ];

  return (
    <Section>
      <SectionHeading title={t.home.faqTitle} subtitle={t.home.faqSubtitle} />
      <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
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

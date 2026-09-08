import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { getPlatformStats } from "@/lib/courses";
import { getSessionUser } from "@/lib/auth/session";
import { bpsToPercent } from "@/lib/money";
import { formatCount } from "@/lib/format";
import { breadcrumbSchema, buildMetadata, faqSchema } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/Button";
import { Card, JsonLd, SectionHeading } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.nav.becomeCreator,
    description:
      locale === "en"
        ? "Build a course, set your price and earn from every sale. Free to start — commission is only charged on a sale."
        : "შექმენი კურსი, დააწესე ფასი და გამოიმუშავე ყოველი გაყიდვიდან. დაწყება უფასოა — საკომისიო იჭრება მხოლოდ გაყიდვისას.",
    path: "/become-instructor",
    locale,
  });
}

/** Landing page for prospective instructors. */
export default async function BecomeInstructorPage() {
  const [{ locale, t }, settings, stats, user] = await Promise.all([
    getI18n(),
    getSettings(),
    getPlatformStats(),
    getSessionUser(),
  ]);

  const p = (path: string) => localePath(path, locale);
  const commission = bpsToPercent(settings.commissionBps);
  const creatorShare = 100 - commission;

  const ctaHref = user
    ? user.creatorId
      ? p("/dashboard/creator")
      : p("/dashboard/profile")
    : `${p("/register")}?type=creator`;

  const steps: { icon: IconName; title: string; body: string }[] = [
    {
      icon: "edit",
      title: locale === "en" ? "Build your course" : "შექმენი კურსი",
      body:
        locale === "en"
          ? "Modules, video, PDFs, quizzes and assignments — all in one builder, with drag-and-drop ordering."
          : "მოდულები, ვიდეო, PDF, ქვიზები და დავალებები — ერთ კონსტრუქტორში, თანმიმდევრობის მარტივი შეცვლით.",
    },
    {
      icon: "shield",
      title: locale === "en" ? "Submit for review" : "გააგზავნე განხილვაზე",
      body:
        locale === "en"
          ? "A short quality check keeps the catalogue trustworthy. You get concrete feedback, not a silent rejection."
          : "მოკლე ხარისხის შემოწმება ინარჩუნებს კატალოგის სანდოობას. მიიღებ კონკრეტულ უკუკავშირს, არა მდუმარე უარს.",
    },
    {
      icon: "wallet",
      title: locale === "en" ? "Earn from every sale" : "გამოიმუშავე ყოველი გაყიდვიდან",
      body:
        locale === "en"
          ? `You keep ${creatorShare}% of every sale. Track earnings in real time and withdraw to a Georgian bank account.`
          : `გაყიდვის ${creatorShare}% შენია. თვალი ადევნე შემოსავალს რეალურ დროში და გაიტანე ქართულ საბანკო ანგარიშზე.`,
    },
  ];

  const faqs = [
    {
      question:
        locale === "en" ? "How much does it cost to start?" : "რა ღირს დაწყება?",
      answer:
        locale === "en"
          ? `Nothing. Creating an account and building courses is free. The platform takes ${commission}% only when a course actually sells.`
          : `არაფერი. ანგარიშის შექმნა და კურსების აწყობა უფასოა. პლატფორმა იღებს ${commission}%-ს მხოლოდ მაშინ, როცა კურსი რეალურად იყიდება.`,
    },
    {
      question: locale === "en" ? "When do I get paid?" : "როდის მივიღებ თანხას?",
      answer:
        locale === "en"
          ? `A sale stays pending for ${settings.payoutClearingDays} days (the refund window), then becomes withdrawable. You request a payout to your Georgian IBAN.`
          : `გაყიდვის თანხა ${settings.payoutClearingDays} დღე რჩება მოლოდინში (დაბრუნების ვადა), შემდეგ ხდება გასატანად ხელმისაწვდომი. გატანას ითხოვ ქართულ IBAN-ზე.`,
    },
    {
      question:
        locale === "en" ? "Do I keep the rights to my course?" : "რჩება თუ არა კურსი ჩემი?",
      answer:
        locale === "en"
          ? "Yes. Your content stays yours. You can unpublish at any time; students who already bought keep access to what they paid for."
          : "დიახ. კონტენტი შენია. გამოქვეყნების მოხსნა ნებისმიერ დროს შეგიძლია; უკვე შემძენი სტუდენტები ინარჩუნებენ წვდომას იმაზე, რაშიც გადაიხადეს.",
    },
    {
      question:
        locale === "en"
          ? "I coach clients in person. Why put a programme online?"
          : "კლიენტებს ცოცხლად ვამზადებ. რატომ უნდა გავიტანო პროგრამა ონლაინ?",
      answer:
        locale === "en"
          ? "Because your time is the one thing you cannot scale. A programme you record once keeps selling while you are with the client in front of you — and it reaches the people who will never make it to your gym or studio."
          : "იმიტომ, რომ შენი დრო ერთადერთია, რისი გამრავლებაც შეუძლებელია. ერთხელ ჩაწერილი პროგრამა იყიდება მაშინაც, როცა შენ სხვა კლიენტთან ხარ — და სწვდება იმ ადამიანებს, რომლებიც შენს დარბაზში ან სტუდიაში ვერასდროს მოვლენ.",
    },
    {
      question:
        locale === "en"
          ? "I already have an audience on Instagram or YouTube. Does that help?"
          : "უკვე მყავს აუდიტორია Instagram-ზე ან YouTube-ზე. ეს მეხმარება?",
      answer:
        locale === "en"
          ? "It is the biggest single advantage you can bring. You do not need the platform to find you buyers — you need a place that can take payment in GEL, deliver the content, and pay you out. That is exactly what this is."
          : "ეს ყველაზე დიდი უპირატესობაა, რაც შეიძლება გქონდეს. შენ პლატფორმა იმისთვის არ გჭირდება, რომ მყიდველი გიპოვოს — გჭირდება ადგილი, რომელიც ლარში მიიღებს გადახდას, მიაწვდის კონტენტს და შენ გადმოგირიცხავს. ზუსტად ესაა.",
    },
    {
      question:
        locale === "en" ? "What equipment do I need?" : "რა ტექნიკა მჭირდება?",
      answer:
        locale === "en"
          ? "A phone and a quiet room are enough to start. Clear audio matters far more to students than camera quality — a shaky handheld clip with clean sound beats a beautiful one you cannot hear."
          : "დასაწყისისთვის საკმარისია ტელეფონი და მშვიდი ოთახი. სტუდენტისთვის ხმის სიცხადე გაცილებით მნიშვნელოვანია, ვიდრე კამერის ხარისხი — ხელით გადაღებული, მაგრამ კარგად გასაგონი ვიდეო სჯობს ლამაზს, რომელიც არ ისმის.",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60rem 30rem at 15% -10%, rgb(255 87 16 / 0.10), transparent 60%)," +
              "radial-gradient(46rem 26rem at 88% 6%, rgb(53 89 240 / 0.10), transparent 62%)",
          }}
        />

        <div className="container-page py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">{t.nav.becomeCreator}</p>
            <h1 className="text-balance text-4xl/[1.2] sm:text-5xl/[1.18] lg:text-6xl/[1.16]">
              {t.home.creatorCtaTitle}
            </h1>
            <p className="mt-5 text-pretty text-[17px] leading-relaxed text-ink-muted">
              {t.home.creatorCtaBody}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={ctaHref} size="lg">
                {t.home.creatorCtaButton}
                <Icon name="arrowRight" size={17} />
              </ButtonLink>
              <ButtonLink href={p("/instructors")} variant="outline" size="lg">
                {t.nav.creators}
              </ButtonLink>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6">
              <div>
                <dt className="text-[13px] text-ink-muted">
                  {locale === "en" ? "You keep" : "შენი წილი"}
                </dt>
                <dd className="text-3xl font-bold tabular-nums text-ink">{creatorShare}%</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">{t.home.statStudents}</dt>
                <dd className="text-3xl font-bold tabular-nums text-ink">
                  {formatCount(stats.students, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">{t.home.statCourses}</dt>
                <dd className="text-3xl font-bold tabular-nums text-ink">
                  {formatCount(stats.courses, locale)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeading title={t.home.audienceTitle} subtitle={t.home.audienceSubtitle} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "dumbbell" as IconName, title: t.home.audience1Title, body: t.home.audience1Body, tint: "#f03c06" },
            { icon: "leaf" as IconName, title: t.home.audience2Title, body: t.home.audience2Body, tint: "#12b76a" },
            { icon: "camera" as IconName, title: t.home.audience3Title, body: t.home.audience3Body, tint: "#3559f0" },
            { icon: "target" as IconName, title: t.home.audience4Title, body: t.home.audience4Body, tint: "#9333ea" },
          ].map((a) => (
            <li key={a.title}>
              <Card className="h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${a.tint}14`, color: a.tint }}
                >
                  <Icon name={a.icon} size={23} />
                </span>
                <h3 className="mt-4 text-[17px]">{a.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{a.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page py-16">
        <SectionHeading
          title={t.home.howItWorksTitle}
          subtitle={locale === "en" ? "Three steps" : "სამი ნაბიჯი"}
        />
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="relative h-full p-6">
                <span className="absolute right-5 top-5 text-5xl font-black leading-none text-surface-sunken">
                  {index + 1}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                  <Icon name={step.icon} size={21} />
                </span>
                <h3 className="mt-4 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-surface-muted">
        <div className="container-page py-16">
          <SectionHeading title={t.home.creatorBenefitsTitle} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "wallet" as IconName, title: t.home.creatorBenefit1Title, body: t.home.creatorBenefit1Body },
              { icon: "video" as IconName, title: t.home.creatorBenefit2Title, body: t.home.creatorBenefit2Body },
              { icon: "chart" as IconName, title: t.home.creatorBenefit3Title, body: t.home.creatorBenefit3Body },
              { icon: "bank" as IconName, title: t.home.creatorBenefit4Title, body: t.home.creatorBenefit4Body },
            ].map((benefit) => (
              <li key={benefit.title}>
                <Card className="h-full p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name={benefit.icon} size={19} />
                  </span>
                  <h3 className="mt-3.5 text-[15px]">{benefit.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                    {benefit.body}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeading title={t.home.faqTitle} />
        <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-semibold text-ink">
                {faq.question}
                <Icon
                  name="chevronDown"
                  size={18}
                  className="shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 text-center">
          <ButtonLink href={ctaHref} size="xl">
            {t.home.creatorCtaButton}
            <Icon name="arrowRight" size={18} />
          </ButtonLink>
          <p className="mt-3 text-[13px] text-ink-subtle">{t.home.creatorCtaNote}</p>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema(
            [
              { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
              { name: t.nav.becomeCreator, path: "/become-instructor" },
            ],
            locale,
          ),
          ...(faqSchema(faqs) ? [faqSchema(faqs)!] : []),
        ]}
      />
    </>
  );
}

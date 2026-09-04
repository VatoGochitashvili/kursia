import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { bpsToPercent } from "@/lib/money";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import { Breadcrumbs, JsonLd } from "@/components/ui/primitives";

/**
 * Legal / informational pages.
 *
 * These are genuine starting drafts written for a Georgian marketplace, with
 * the platform's own configured values (commission, refund window) filled in —
 * NOT lorem ipsum. They still need review by a lawyer before launch, and the
 * page says so where it matters.
 */
export const revalidate = 3600;

type PageKey = "terms" | "privacy" | "refund-policy" | "about" | "contact" | "help";

const PAGES: PageKey[] = ["terms", "privacy", "refund-policy", "about", "contact", "help"];

export function generateStaticParams() {
  return PAGES.map((page) => ({ page }));
}

interface Props {
  params: Promise<{ page: string }>;
}

interface Section {
  heading: string;
  body: string[];
}

interface Content {
  title: string;
  intro: string;
  sections: Section[];
}

function buildContent(
  key: PageKey,
  locale: "ka" | "en",
  settings: {
    platformName: string;
    supportEmail: string;
    commissionPercent: number;
    refundWindowDays: number;
    payoutClearingDays: number;
  },
): Content {
  const ka = locale === "ka";
  const brand = settings.platformName;

  switch (key) {
    case "terms":
      return {
        title: ka ? "წესები და პირობები" : "Terms of Service",
        intro: ka
          ? `ეს დოკუმენტი აღწერს ${brand}-ის გამოყენების პირობებს სტუდენტებისა და ინსტრუქტორებისთვის.`
          : `This document sets out the terms for using ${brand} as a student or an instructor.`,
        sections: [
          {
            heading: ka ? "1. ანგარიში" : "1. Your account",
            body: [
              ka
                ? "ანგარიშის შესაქმნელად უნდა იყოთ 18 წლის ან მეტის, ან გქონდეთ მშობლის თანხმობა. თქვენ პასუხისმგებელი ხართ თქვენი პაროლის დაცვაზე და ანგარიშიდან განხორციელებულ ქმედებებზე."
                : "You must be 18 or older, or have a parent's consent, to create an account. You are responsible for keeping your password safe and for activity carried out from your account.",
              ka
                ? "ერთი ანგარიში ეკუთვნის ერთ ადამიანს. ანგარიშის გაზიარება ან შეძენილ კურსზე წვდომის გადაცემა სხვისთვის იკრძალება."
                : "One account belongs to one person. Sharing an account, or passing purchased course access to someone else, is not permitted.",
            ],
          },
          {
            heading: ka ? "2. კურსების შეძენა" : "2. Buying courses",
            body: [
              ka
                ? "კურსზე წვდომა იხსნება მხოლოდ გადახდის დადასტურების შემდეგ. ფასები მითითებულია ლარში და მოიცავს კანონით გათვალისწინებულ გადასახადებს."
                : "Course access opens only after payment is confirmed. Prices are shown in GEL and include applicable taxes.",
              ka
                ? "შეძენილი კურსი ხელმისაწვდომია უვადოდ, გარდა იმ შემთხვევისა, როცა კურსი კანონის ან უფლების დარღვევის გამო იშლება პლატფორმიდან."
                : "A purchased course remains available indefinitely, unless it must be removed for legal or rights reasons.",
            ],
          },
          {
            heading: ka ? "3. ინსტრუქტორები" : "3. Instructors",
            body: [
              ka
                ? `ინსტრუქტორი ინარჩუნებს საკუთარი კონტენტის უფლებებს და ანიჭებს ${brand}-ს ლიცენზიას მისი გავრცელებისთვის პლატფორმაზე. ინსტრუქტორი იღებს გაყიდვის ${100 - settings.commissionPercent}%-ს; პლატფორმის საკომისიოა ${settings.commissionPercent}%.`
                : `Instructors keep the rights to their content and grant ${brand} a licence to distribute it on the platform. Instructors receive ${100 - settings.commissionPercent}% of each sale; the platform commission is ${settings.commissionPercent}%.`,
              ka
                ? "ინსტრუქტორი აცხადებს, რომ ატვირთულ მასალაზე გააჩნია ყველა საჭირო უფლება და რომ ის არ არღვევს მესამე პირის საავტორო უფლებას."
                : "Instructors confirm they hold all necessary rights to the material they upload and that it does not infringe anyone else's copyright.",
            ],
          },
          {
            heading: ka ? "4. აკრძალული ქმედებები" : "4. Prohibited conduct",
            body: [
              ka
                ? "იკრძალება კურსის ჩაწერა, გადმოწერა ან გავრცელება; სხვისი ანგარიშით სარგებლობა; პლატფორმის ტექნიკური დაცვის გვერდის ავლის მცდელობა; შეურაცხმყოფელი ან უკანონო კონტენტის განთავსება."
                : "Recording, downloading or redistributing course content; using someone else's account; attempting to bypass technical protections; and posting abusive or unlawful content are all prohibited.",
            ],
          },
          {
            heading: ka ? "5. ანგარიშის შეჩერება" : "5. Suspension",
            body: [
              ka
                ? "ამ წესების დარღვევისას ანგარიში შეიძლება შეჩერდეს. თანხის დაბრუნება ასეთ შემთხვევაში ხდება დაბრუნების პოლიტიკის შესაბამისად."
                : "Accounts may be suspended for breaching these terms. Any refund in that case follows the Refund Policy.",
            ],
          },
          {
            heading: ka ? "6. კონტაქტი" : "6. Contact",
            body: [settings.supportEmail],
          },
        ],
      };

    case "privacy":
      return {
        title: ka ? "კონფიდენციალურობის პოლიტიკა" : "Privacy Policy",
        intro: ka
          ? "ეს პოლიტიკა აღწერს, რა მონაცემებს ვაგროვებთ, რატომ და როგორ ვიცავთ მათ."
          : "This policy explains what data we collect, why, and how we protect it.",
        sections: [
          {
            heading: ka ? "რას ვაგროვებთ" : "What we collect",
            body: [
              ka
                ? "ანგარიშის მონაცემები (სახელი, ელფოსტა), სასწავლო პროგრესი, შენაძენების ისტორია და ტექნიკური ჟურნალები. პაროლი ინახება მხოლოდ ჰეშირებული სახით და არასდროს — ღია ტექსტად."
                : "Account details (name, email), learning progress, purchase history and technical logs. Passwords are stored only as hashes, never in plain text.",
              ka
                ? "საბანკო ბარათის მონაცემები არასდროს გვხვდება — გადახდას ამუშავებს ლიცენზირებული საგადახდო პროვაიდერი."
                : "We never see card details — payments are processed by a licensed payment provider.",
            ],
          },
          {
            heading: ka ? "ანალიტიკა" : "Analytics",
            body: [
              ka
                ? "კურსის ნახვების დათვლისას ვინახავთ მხოლოდ ჰეშირებულ, არაიდენტიფიცირებად მნიშვნელობას — არა IP მისამართს ან ბრაუზერის სრულ მონაცემებს."
                : "When counting course views we store only a hashed, non-identifying value — not your IP address or full browser fingerprint.",
            ],
          },
          {
            heading: ka ? "თქვენი უფლებები" : "Your rights",
            body: [
              ka
                ? `შეგიძლიათ მოითხოვოთ თქვენი მონაცემების ასლი, შესწორება ან წაშლა — მოგვწერეთ ${settings.supportEmail}. ფინანსური ჩანაწერები ინახება კანონით დადგენილი ვადით.`
                : `You may request a copy, correction or deletion of your data — write to ${settings.supportEmail}. Financial records are retained for the period required by law.`,
            ],
          },
        ],
      };

    case "refund-policy":
      return {
        title: ka ? "თანხის დაბრუნების პოლიტიკა" : "Refund Policy",
        intro: ka
          ? `თუ კურსი არ დაგაკმაყოფილათ, თანხის დაბრუნება შესაძლებელია შეძენიდან ${settings.refundWindowDays} დღის განმავლობაში.`
          : `If a course is not what you expected, you can request a refund within ${settings.refundWindowDays} days of purchase.`,
        sections: [
          {
            heading: ka ? "როგორ მოვითხოვო" : "How to request",
            body: [
              ka
                ? "გადადით „შენაძენებში“, აირჩიეთ კურსი და დააჭირეთ „თანხის დაბრუნებას“. მიუთითეთ მიზეზი — ეს გვეხმარება კურსების ხარისხის გაუმჯობესებაში."
                : "Go to Purchases, choose the course and click Request a refund. Tell us why — it helps us improve course quality.",
            ],
          },
          {
            heading: ka ? "როდის შეიძლება უარი" : "When a refund may be declined",
            body: [
              ka
                ? `თუ ${settings.refundWindowDays} დღე გასულია, ან თუ კურსი თითქმის სრულად არის დასრულებული და მასალა ჩამოტვირთულია, მოთხოვნა შეიძლება არ დაკმაყოფილდეს.`
                : `If the ${settings.refundWindowDays}-day window has passed, or the course is almost fully completed and its materials downloaded, the request may be declined.`,
            ],
          },
          {
            heading: ka ? "დამუშავების ვადა" : "Processing time",
            body: [
              ka
                ? "დამტკიცების შემდეგ თანხა ბრუნდება იმავე ბარათზე, საიდანაც გადაიხადეთ. ბანკის მხრიდან ჩარიცხვას შეიძლება 3–10 სამუშაო დღე დასჭირდეს."
                : "Once approved, the amount is returned to the card you paid with. Banks typically take 3–10 working days to post it.",
            ],
          },
          {
            heading: ka ? "ინსტრუქტორებისთვის" : "For instructors",
            body: [
              ka
                ? `დაბრუნებული გაყიდვის თქვენი წილი უკან იჭრება ბალანსიდან. სწორედ ამიტომ რჩება გაყიდვის თანხა მოლოდინში ${settings.payoutClearingDays} დღე გატანამდე.`
                : `Your share of a refunded sale is reversed from your balance. That is why a sale stays pending for ${settings.payoutClearingDays} days before it becomes withdrawable.`,
            ],
          },
        ],
      };

    case "about":
      return {
        title: ka ? "ჩვენ შესახებ" : "About",
        intro: ka
          ? `${brand} არის ქართული ონლაინ სასწავლო პლატფორმა — ადგილი, სადაც ქართველი და საერთაშორისო ექსპერტები ყიდიან კურსებს, ხოლო სტუდენტები სწავლობენ მშობლიურ ენაზე.`
          : `${brand} is a Georgian online learning marketplace — a place where Georgian and international experts sell courses, and students learn in their own language.`,
        sections: [
          {
            heading: ka ? "რატომ" : "Why",
            body: [
              ka
                ? "ქართულენოვანი ხარისხიანი სასწავლო კონტენტი მიმოფანტულია და ხშირად სისტემურობას მოკლებული. ჩვენი მიზანია ერთი სანდო ადგილი, სადაც კურსს იპოვი, შეიძენ ლარით და ბოლომდე მიიყვან."
                : "Quality Georgian-language learning content is scattered and often unstructured. We want one trustworthy place to find a course, buy it in GEL, and actually finish it.",
            ],
          },
          {
            heading: ka ? "ინსტრუქტორებისთვის" : "For instructors",
            body: [
              ka
                ? `თუ რაღაცას კარგად აკეთებ, ამის სწავლება შემოსავლის წყარო შეიძლება გახდეს. პლატფორმა იღებს ${settings.commissionPercent}%-ს მხოლოდ რეალური გაყიდვისას.`
                : `If you are good at something, teaching it can become income. The platform takes ${settings.commissionPercent}% only on an actual sale.`,
            ],
          },
        ],
      };

    case "contact":
      return {
        title: ka ? "კონტაქტი" : "Contact",
        intro: ka
          ? "დაგვიკავშირდით — ვპასუხობთ სამუშაო დღეებში."
          : "Get in touch — we reply on working days.",
        sections: [
          {
            heading: ka ? "ელფოსტა" : "Email",
            body: [settings.supportEmail],
          },
          {
            heading: ka ? "ინსტრუქტორებისთვის" : "For instructors",
            body: [
              ka
                ? "კურსის განხილვასთან, გატანასთან ან საკომისიოსთან დაკავშირებული კითხვები — მოგვწერეთ იმავე მისამართზე და მიუთითეთ თქვენი ინსტრუქტორის სახელი."
                : "For questions about course review, payouts or commission, write to the same address and include your instructor name.",
            ],
          },
        ],
      };

    case "help":
      return {
        title: ka ? "დახმარება" : "Help",
        intro: ka
          ? "ხშირად დასმული კითხვები და მოკლე ინსტრუქციები."
          : "Frequently asked questions and short guides.",
        sections: [
          {
            heading: ka ? "ვერ ვხსნი შეძენილ კურსს" : "I can't open a course I bought",
            body: [
              ka
                ? "შეამოწმეთ „შენაძენებში“ შეკვეთის სტატუსი. თუ ის „მოლოდინშია“, გადახდა ჯერ არ დაუდასტურებია ბანკს. თუ „გადახდილია“, მაგრამ კურსი არ იხსნება — მოგვწერეთ და მიუთითეთ შეკვეთის ნომერი."
                : "Check the order status under Purchases. If it says Pending, the bank has not confirmed the payment yet. If it says Paid but the course will not open, write to us with the order reference.",
            ],
          },
          {
            heading: ka ? "ვიდეო არ ეშვება" : "Video won't play",
            body: [
              ka
                ? "ვიდეო იშლება მხოლოდ თქვენს ანგარიშზე მიბმული, დროებითი ბმულით. თუ გვერდი დიდხანს იყო ღია, განაახლეთ ის — ბმული ავტომატურად განახლდება."
                : "Video is served through a short-lived link tied to your account. If the page has been open for a long time, refresh it — the link renews automatically.",
            ],
          },
          {
            heading: ka ? "სერტიფიკატი არ გამოჩნდა" : "My certificate hasn't appeared",
            body: [
              ka
                ? "სერტიფიკატი გენერირდება კურსის 100%-ით დასრულებისას. შეამოწმეთ, ყველა გაკვეთილი მონიშნულია თუ არა დასრულებულად."
                : "A certificate is generated when a course reaches 100%. Check that every lesson is marked complete.",
            ],
          },
        ],
      };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  if (!PAGES.includes(page as PageKey)) return { title: "404" };

  const [{ locale }, settings] = await Promise.all([getI18n(), getSettings()]);
  const content = buildContent(page as PageKey, locale, {
    platformName: locale === "en" ? settings.platformName : settings.platformNameKa,
    supportEmail: settings.supportEmail,
    commissionPercent: bpsToPercent(settings.commissionBps),
    refundWindowDays: settings.refundWindowDays,
    payoutClearingDays: settings.payoutClearingDays,
  });

  return buildMetadata({
    title: content.title,
    description: content.intro,
    path: `/${page}`,
    locale,
  });
}

export default async function LegalPage({ params }: Props) {
  const { page } = await params;
  if (!PAGES.includes(page as PageKey)) notFound();

  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const content = buildContent(page as PageKey, locale, {
    platformName: locale === "en" ? settings.platformName : settings.platformNameKa,
    supportEmail: settings.supportEmail,
    commissionPercent: bpsToPercent(settings.commissionBps),
    refundWindowDays: settings.refundWindowDays,
    payoutClearingDays: settings.payoutClearingDays,
  });

  const p = (path: string) => localePath(path, locale);
  const isLegal = page === "terms" || page === "privacy" || page === "refund-policy";

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: locale === "en" ? "Home" : "მთავარი", href: p("/") },
              { label: content.title },
            ]}
          />
          <h1 className="text-3xl sm:text-4xl">{content.title}</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">{content.intro}</p>
        </div>
      </div>

      <article className="container-page py-10">
        <div className="max-w-prose space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-xl">{section.heading}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i} className="mb-3 text-[15px] leading-relaxed text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          {isLegal && (
            <p className="rounded-xl border border-warn-500/25 bg-warn-50 px-4 py-3 text-[13px] text-warn-700">
              {locale === "en"
                ? "This is a working draft prepared for a Georgian marketplace. Have it reviewed by a qualified lawyer before launch."
                : "ეს არის სამუშაო ვერსია, მომზადებული ქართული ბაზრისთვის. გაშვებამდე გადაამოწმეთ იურისტთან."}
            </p>
          )}
        </div>
      </article>

      <JsonLd
        data={breadcrumbSchema(
          [
            { name: locale === "en" ? "Home" : "მთავარი", path: "/" },
            { name: content.title, path: `/${page}` },
          ],
          locale,
        )}
      />
    </>
  );
}

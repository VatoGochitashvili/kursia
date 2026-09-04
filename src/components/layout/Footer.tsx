import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getCategoryTree } from "@/lib/courses";
import { getI18n, localePath } from "@/i18n";
import { Logo } from "./Logo";

export async function Footer() {
  const [{ locale, t }, settings, categories] = await Promise.all([
    getI18n(),
    getSettings(),
    getCategoryTree(),
  ]);

  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;
  const p = (path: string) => localePath(path, locale);

  const columns = [
    {
      title: t.footer.learn,
      links: [
        { label: t.nav.courses, href: p("/courses") },
        { label: t.nav.categories, href: p("/categories") },
        { label: t.nav.creators, href: p("/instructors") },
        { label: t.footer.verifyCertificate, href: p("/certificate") },
      ],
    },
    {
      title: t.footer.teach,
      links: [
        { label: t.nav.becomeCreator, href: p("/become-instructor") },
        { label: t.creator.studio, href: p("/dashboard/creator") },
        { label: t.footer.help, href: p("/help") },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { label: t.footer.about, href: p("/about") },
        { label: t.footer.contact, href: p("/contact") },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { label: t.footer.terms, href: p("/terms") },
        { label: t.footer.privacy, href: p("/privacy") },
        { label: t.footer.refundPolicy, href: p("/refund-policy") },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-surface-muted no-print">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <Logo size={30} />
              <span className="text-[17px] font-bold tracking-tight text-ink">{brand}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t.footer.tagline}</p>
            <a
              href={`mailto:${settings.supportEmail}`}
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              {settings.supportEmail}
            </a>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-[13px] font-semibold text-ink">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink-muted transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Category links in the footer give crawlers a path to every hub page. */}
        <nav className="mt-10 border-t border-line pt-6" aria-label={t.nav.categories}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={p(`/category/${c.slug}`)}
                  className="text-[13px] text-ink-subtle transition-colors hover:text-brand-600"
                >
                  {locale === "en" ? c.nameEn : c.nameKa}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-[13px] text-ink-subtle">
            © {new Date().getFullYear()} {brand}. {t.footer.allRights}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={localePath("/", locale === "ka" ? "en" : "ka")}
              className="text-[13px] font-medium text-ink-muted hover:text-brand-600"
            >
              {locale === "ka" ? "English" : "ქართული"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

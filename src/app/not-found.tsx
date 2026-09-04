import Link from "next/link";
import { getI18n, localePath } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { SearchBar } from "@/components/layout/SearchBar";
import { Icon } from "@/components/ui/Icon";

/** Global 404. Offers search and the main hubs rather than a dead end. */
export default async function NotFound() {
  const [{ locale, t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const p = (path: string) => localePath(path, locale);
  const brand = locale === "en" ? settings.platformName : settings.platformNameKa;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href={p("/")} className="flex items-center gap-2">
            <Logo size={30} />
            <span className="text-[17px] font-bold tracking-tight text-ink">{brand}</span>
          </Link>
        </div>
      </header>

      <main className="container-page flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-lg text-center">
          <p className="text-7xl font-black tracking-tight text-surface-sunken">404</p>
          <h1 className="mt-2 text-3xl">{t.errors.e404Title}</h1>
          <p className="mt-2 text-[15px] text-ink-muted">{t.errors.e404Body}</p>

          <div className="mt-7">
            <SearchBar
              placeholder={t.home.heroSearchPlaceholder}
              action={p("/courses")}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href={p("/")}>{t.errors.goHome}</ButtonLink>
            <ButtonLink href={p("/courses")} variant="outline">
              <Icon name="book" size={16} />
              {t.dashboard.browseCourses}
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}

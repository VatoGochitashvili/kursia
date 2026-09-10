"use client";

import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";

/**
 * The header's mobile search row — hidden on the homepage.
 *
 * The hero already opens with a large search field, so on a phone the two
 * stack into a single screen showing the same control twice, one directly
 * under the other. Everywhere else the header row is the only search there
 * is, so it stays.
 *
 * Only this row is client-side; the rest of the header is still rendered on
 * the server, so navigation and the search form are both in the initial HTML.
 */
export function MobileHeaderSearch({
  placeholder,
  action,
  homePaths,
}: {
  placeholder: string;
  action: string;
  /** Every locale's spelling of "/" — the pathname here is pre-rewrite. */
  homePaths: string[];
}) {
  const pathname = usePathname();
  if (homePaths.includes(pathname)) return null;

  return (
    <div className="border-t border-line px-4 py-2 md:hidden">
      <SearchBar placeholder={placeholder} action={action} />
    </div>
  );
}

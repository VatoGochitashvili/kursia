import { redirect } from "next/navigation";
import { getI18n, localePath } from "@/i18n";

/**
 * There is no "my lessons" page any more — courses live inside circles. The
 * account's home is the profile, which lists the circles instead.
 */
export default async function DashboardHome() {
  const { locale } = await getI18n();
  redirect(localePath("/dashboard/profile", locale));
}

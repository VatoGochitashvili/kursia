import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/settings";
import { availableProviders } from "@/lib/payments";
import { bpsToPercent, toMajor } from "@/lib/money";
import { PageHeader } from "@/components/layout/DashboardShell";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [{ locale, t }, settings, providers] = await Promise.all([
    getI18n(),
    getSettings(),
    availableProviders(),
  ]);

  return (
    <>
      <PageHeader
        title={t.admin.settings}
        subtitle={
          locale === "en"
            ? "These values drive the live platform — commission, branding and moderation."
            : "ეს პარამეტრები მართავს პლატფორმას — საკომისიო, ბრენდინგი და მოდერაცია."
        }
      />

      <SettingsForm
        locale={locale}
        initial={{
          platformName: settings.platformName,
          platformNameKa: settings.platformNameKa,
          taglineKa: settings.taglineKa,
          taglineEn: settings.taglineEn,
          logoUrl: settings.logoUrl,
          supportEmail: settings.supportEmail,
          currency: settings.currency,
          commissionPercent: String(bpsToPercent(settings.commissionBps)),
          payoutClearingDays: String(settings.payoutClearingDays),
          payoutMinimum: String(toMajor(settings.payoutMinimumMinor, settings.currency)),
          refundWindowDays: String(settings.refundWindowDays),
          courseApprovalRequired: settings.courseApprovalRequired,
          registrationOpen: settings.registrationOpen,
          creatorRegistrationOpen: settings.creatorRegistrationOpen,
          creatorAutoApprove: settings.creatorAutoApprove,
          seoDefaultTitleKa: settings.seoDefaultTitleKa,
          seoDefaultDescriptionKa: settings.seoDefaultDescriptionKa,
          paymentProviders: settings.paymentProviders,
          defaultPaymentProvider: settings.defaultPaymentProvider,
        }}
        availableProviders={providers.map((provider) => ({
          id: provider.id,
          label: locale === "en" ? provider.labelEn : provider.labelKa,
          description: locale === "en" ? provider.descriptionEn : provider.descriptionKa,
          icon: provider.icon,
          manualSettlement: provider.manualSettlement,
        }))}
        labels={{
          branding: locale === "en" ? "Branding" : "ბრენდინგი",
          commerce: locale === "en" ? "Commerce" : "კომერცია",
          moderation: t.admin.moderation,
          access: locale === "en" ? "Registration" : "რეგისტრაცია",
          payments: t.checkout.paymentMethod,
          seo: "SEO",
          platformName: locale === "en" ? "Platform name (Latin)" : "პლატფორმის სახელი (ლათინური)",
          platformNameKa: locale === "en" ? "Platform name (Georgian)" : "პლატფორმის სახელი (ქართული)",
          taglineKa: locale === "en" ? "Tagline (Georgian)" : "სლოგანი (ქართული)",
          taglineEn: locale === "en" ? "Tagline (English)" : "სლოგანი (ინგლისური)",
          logoUrl: locale === "en" ? "Logo URL" : "ლოგოს URL",
          supportEmail: locale === "en" ? "Support email" : "მხარდაჭერის ელფოსტა",
          currency: locale === "en" ? "Currency" : "ვალუტა",
          commission: t.admin.commission,
          commissionHint:
            locale === "en"
              ? "Deducted from each sale. Applies to new sales only — past orders keep the rate they were charged."
              : "იჭრება ყოველი გაყიდვიდან. მოქმედებს მხოლოდ ახალ გაყიდვებზე — არსებული შეკვეთები ინარჩუნებს ძველ განაკვეთს.",
          clearingDays: locale === "en" ? "Clearing period (days)" : "მოლოდინის პერიოდი (დღე)",
          clearingHint:
            locale === "en"
              ? "How long a sale stays pending before a creator can withdraw it."
              : "რამდენ ხანს რჩება გაყიდვის თანხა მოლოდინში გატანამდე.",
          payoutMinimum: locale === "en" ? "Minimum payout" : "მინიმალური გატანა",
          refundWindow: locale === "en" ? "Refund window (days)" : "დაბრუნების ვადა (დღე)",
          approvalRequired:
            locale === "en" ? "Require admin approval to publish" : "გამოქვეყნებამდე ადმინის დამტკიცება",
          registrationOpen: locale === "en" ? "Registration open" : "რეგისტრაცია ღიაა",
          creatorRegistrationOpen:
            locale === "en" ? "Instructor registration open" : "ინსტრუქტორის რეგისტრაცია ღიაა",
          creatorAutoApprove:
            locale === "en" ? "Auto-approve new instructors" : "ინსტრუქტორის ავტომატური დამტკიცება",
          seoTitle: locale === "en" ? "Default SEO title" : "ნაგულისხმევი SEO სათაური",
          seoDescription:
            locale === "en" ? "Default SEO description" : "ნაგულისხმევი SEO აღწერა",
          enabledProviders: locale === "en" ? "Enabled at checkout" : "ჩართულია გადახდისას",
          defaultProvider: locale === "en" ? "Default provider" : "ნაგულისხმევი პროვაიდერი",
          noProviders:
            locale === "en"
              ? "No payment provider is configured. Add credentials in .env — see .env.example."
              : "გადახდის პროვაიდერი არ არის კონფიგურირებული. დაამატეთ credentials .env ფაილში.",
          save: t.common.save,
          saved: t.common.saved,
        }}
      />
    </>
  );
}

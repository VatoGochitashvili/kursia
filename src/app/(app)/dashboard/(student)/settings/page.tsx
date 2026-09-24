import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { ChangePasswordForm } from "@/components/dashboard/ChangePasswordForm";
import { PreferencesForm } from "@/components/dashboard/PreferencesForm";
import { getPreferences } from "@/lib/preferences";
import { Alert, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Editing the account: the public details, the photo, and the password. The
 * profile page shows the result; this is where it is changed.
 */
export default async function SettingsPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();

  const preferences = await getPreferences(user.id);

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: {
      email: true, emailVerified: true, createdAt: true,
      profile: {
        select: {
          fullName: true, username: true, headline: true, bio: true, city: true,
          phone: true, avatarUrl: true, websiteUrl: true, facebookUrl: true,
          youtubeUrl: true, linkedinUrl: true, instagramUrl: true,
        },
      },
      creatorProfile: { select: { slug: true, displayName: true, isVerified: true } },
    },
  });

  const profile = record?.profile;
  const p = (path: string) => localePath(path, locale);

  return (
    <>
      <PageHeader
        title={t.nav.settings}
        subtitle={
          record ? `${t.profile.memberSince.replace("{date}", formatDate(record.createdAt, locale))}` : undefined
        }
        action={
          record?.creatorProfile ? (
            <Link
              href={p(`/creator/${record.creatorProfile.slug}`)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
            >
              <Icon name="external" size={15} />
              {t.profile.publicProfile}
            </Link>
          ) : undefined
        }
      />

      {record && !record.emailVerified && (
        <Alert tone="warn" className="mb-5" title={t.auth.verifyEmailTitle}>
          {t.auth.verifyEmailBody} — {record.email}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <ProfileForm
            initial={{
              fullName: profile?.fullName ?? "",
              username: profile?.username ?? "",
              headline: profile?.headline ?? "",
              bio: profile?.bio ?? "",
              city: profile?.city ?? "",
              phone: profile?.phone ?? "",
              avatarUrl: profile?.avatarUrl ?? "",
              websiteUrl: profile?.websiteUrl ?? "",
              facebookUrl: profile?.facebookUrl ?? "",
              youtubeUrl: profile?.youtubeUrl ?? "",
              linkedinUrl: profile?.linkedinUrl ?? "",
              instagramUrl: profile?.instagramUrl ?? "",
            }}
            labels={{
              publicProfile: t.profile.publicProfile,
              fullName: t.auth.fullName,
              username: t.profile.username,
              usernameHint:
                locale === "en"
                  ? "Latin letters, digits, dot and underscore"
                  : "ლათინური ასოები, ციფრები, წერტილი და ქვედა ტირე",
              headline: t.profile.headline,
              bio: t.profile.bio,
              city: t.profile.city,
              phone: t.profile.phone,
              socialLinks: t.profile.socialLinks,
              currentPhoto: locale === "en" ? "Profile photo" : "პროფილის ფოტო",
              save: t.common.save,
              saved: t.common.saved,
            }}
            uploaderLabels={{
              drop: t.upload.dropImage,
              browse: t.upload.browse,
              uploading: t.upload.uploading,
              replace: t.upload.replace,
              remove: t.upload.remove,
              cancel: t.upload.cancel,
              tooLarge: t.upload.tooLarge,
              wrongType: t.upload.wrongType,
              hint: t.upload.avatarHint,
            }}
          />
        </div>

        <div className="space-y-5">
          <PreferencesForm
            initial={preferences}
            labels={{
              saved: t.settings.settingsSaved,
              notificationsTitle: t.settings.notificationsTitle,
              notificationsHint: t.settings.notificationsHint,
              emailMessages: t.settings.emailMessages,
              emailCircle: t.settings.emailCircle,
              emailEvents: t.settings.emailEvents,
              emailPurchases: t.settings.emailPurchases,
              emailProduct: t.settings.emailProduct,
              pushTitle: t.settings.pushTitle,
              pushSoon: t.settings.pushSoon,
              privacyTitle: t.settings.privacyTitle,
              privacyHint: t.settings.privacyHint,
              allowMessages: t.settings.allowMessages,
              showMemberships: t.settings.showMemberships,
              showOnLeaderboard: t.settings.showOnLeaderboard,
              deactivateTitle: t.settings.deactivateTitle,
              deactivateBody: t.settings.deactivateBody,
              deactivateSend: t.settings.deactivateSend,
              deactivateSent: t.settings.deactivateSent,
              deactivateConfirm: t.settings.deactivateConfirm,
              deactivateDone: t.settings.deactivateDone,
            }}
          />
          <Card className="p-5">
            <h2 className="text-base">{t.profile.security}</h2>
            <p className="mt-1 text-[13px] text-ink-muted">{record?.email}</p>
            <div className="mt-4">
              <ChangePasswordForm
                labels={{
                  current: t.auth.currentPassword,
                  next: t.auth.newPassword,
                  submit: t.profile.changePassword,
                  changed: t.auth.passwordChanged,
                  hint:
                    locale === "en"
                      ? "At least 10 characters, including a digit"
                      : "მინიმუმ 10 სიმბოლო, ერთი ციფრის ჩათვლით",
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

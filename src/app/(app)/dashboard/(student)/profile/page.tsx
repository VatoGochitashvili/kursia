import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { ChangePasswordForm } from "@/components/dashboard/ChangePasswordForm";
import { BecomeCreatorForm } from "@/components/dashboard/BecomeCreatorForm";
import { Alert, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { locale, t } = await getI18n();
  const user = await requireUser();

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
        title={t.profile.title}
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
              changePhoto: locale === "en" ? "Change photo" : "ფოტოს შეცვლა",
              uploading: t.common.saving,
              photoHint: "JPG / PNG / WebP · max 4MB",
              save: t.common.save,
              saved: t.common.saved,
            }}
          />
        </div>

        <div className="space-y-5">
          {!record?.creatorProfile && (
            <Card className="p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                <Icon name="sparkles" size={19} />
              </span>
              <h2 className="mt-3 text-base">{t.profile.becomeCreatorTitle}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {t.profile.becomeCreatorBody}
              </p>
              <div className="mt-4">
                <BecomeCreatorForm
                  defaultName={profile?.fullName ?? ""}
                  labels={{
                    displayName: t.auth.displayName,
                    bio: t.creator.overview,
                    submit: t.nav.becomeCreator,
                  }}
                />
              </div>
            </Card>
          )}

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

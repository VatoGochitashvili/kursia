import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";
import { listMyCircles } from "@/lib/my-circles";
import { PageHeader } from "@/components/layout/DashboardShell";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { ChangePasswordForm } from "@/components/dashboard/ChangePasswordForm";
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

  const circles = await listMyCircles(user.id, locale);
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
          {/* What this account actually belongs to. It used to be nowhere on
              the site: a member could pay every month and never see a list of
              the rooms that bought them. */}
          <Card className="p-5">
            <h2 className="text-base">{t.circle.myCircles}</h2>
            {circles.length === 0 ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                {t.communities.noneYetBody}
              </p>
            ) : (
              <ul className="mt-3 grid gap-1.5">
                {circles.map((circle) => (
                  <li key={circle.creatorId}>
                    <Link
                      href={p(`/community/${circle.slug}`)}
                      className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-surface-sunken"
                    >
                      <span className="h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                        {circle.coverUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- stored or user-configured host
                          <img src={circle.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">
                          {circle.name}
                        </span>
                        {circle.role !== "MEMBER" && (
                          <span className="text-[11px] text-ink-subtle">
                            {circle.role === "OWNER" ? t.circle.owner : t.circle.admin}
                          </span>
                        )}
                      </span>
                      <Icon name="arrowRight" size={14} className="shrink-0 text-ink-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={p("/communities")}
              className="mt-3 inline-flex text-[13px] font-semibold text-brand-600 hover:underline"
            >
              {t.communities.browse}
            </Link>
          </Card>

          {!record?.creatorProfile && (
            <Card className="p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                <Icon name="sparkles" size={19} />
              </span>
              <h2 className="mt-3 text-base">{t.start.title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {t.start.subtitle}
              </p>
              <Link
                href={p("/start")}
                className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {t.start.cta}
                <Icon name="arrowRight" size={16} />
              </Link>
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

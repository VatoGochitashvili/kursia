import { JoinCommunityCard, type CommunityView } from "@/components/community/JoinCommunityCard";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { localePath } from "@/i18n";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

/**
 * What a non-member sees.
 *
 * Two different situations, and telling them apart matters: a community that
 * is open has a price and a join button, and a creator who has not opened one
 * has neither. Showing a join button that cannot work — or a bare "members
 * only" wall on a space anyone could pay to enter — both lose the sale.
 */
export function CommunityGate({
  community,
  creatorSlug,
  isAuthenticated,
  isOwner,
  gate,
  loginHref,
  registerHref,
  coursesHref,
  locale,
  t,
}: {
  community: CommunityView;
  creatorSlug: string;
  isAuthenticated: boolean;
  isOwner: boolean;
  gate?: {
    required: boolean;
    status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    cleared: boolean;
    reviewNote: string | null;
  };
  loginHref: string;
  /** Where "join" sends a visitor with no account. Defaults to sign-up, back to this circle. */
  registerHref?: string;
  coursesHref: string;
  locale: Locale;
  t: Dictionary;
}) {
  // A visitor with no account sees one button and no price. The price and
  // the plan come after they sign in, when they can act on them — a wall of
  // terms in front of somebody who has not even registered only turns them away.
  if (community.enabled && !isAuthenticated) {
    const signUp =
      registerHref ?? localePath(`/register?next=/community/${creatorSlug}`, locale);
    return (
      <Card className="p-6 text-center sm:p-8">
        <h2 className="text-xl">{community.name}</h2>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-muted">
          {t.circle.joinHint}
        </p>
        <ButtonLink className="mt-6 min-w-48" href={signUp} size="lg">
          {t.circle.join}
        </ButtonLink>
        <p className="mt-4 text-[13px] text-ink-muted">
          {t.auth.hasAccount}{" "}
          <Link href={loginHref} className="font-semibold text-brand-600 hover:underline">
            {t.nav.login}
          </Link>
        </p>
      </Card>
    );
  }

  if (community.enabled) {
    return (
      <JoinCommunityCard
        community={community}
        isAuthenticated={isAuthenticated}
        isOwner={isOwner}
        isSubscriber={false}
        memberUntil={null}
        cancelled={false}
        gate={gate}
        loginHref={loginHref}
        locale={locale}
        t={t}
      />
    );
  }

  // No community on sale — the only way in is buying one of their courses.
  return (
    <Card className="p-8 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name="lock" size={24} />
      </span>
      <h2 className="mt-5 text-xl">{t.community.lockedTitle}</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">
        {t.community.lockedBody}
      </p>
      <ButtonLink className="mt-6" href={coursesHref} size="lg">
        {t.community.lockedCta}
        <Icon name="arrowRight" size={17} />
      </ButtonLink>
    </Card>
  );
}

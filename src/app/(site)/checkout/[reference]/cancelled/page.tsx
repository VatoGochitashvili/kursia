import type { Metadata } from "next";
import { getI18n, localePath } from "@/i18n";
import { requireUser } from "@/lib/auth/rbac";
import { getPurchaseForViewer } from "@/lib/checkout-view";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutCancelledPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { locale, t } = await getI18n();
  const { reference } = await params;
  const user = await requireUser();
  const purchase = await getPurchaseForViewer(reference, user.id);
  const p = (path: string) => localePath(path, locale);

  return (
    <div className="container-page flex min-h-[70dvh] items-center justify-center py-14">
      <Card className="w-full max-w-md p-8 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-sunken text-ink-muted">
          <Icon name="close" size={28} />
        </span>
        <h1 className="mt-5 text-2xl">{t.checkout.cancelledTitle}</h1>
        <p className="mt-2 text-[15px] text-ink-muted">{t.checkout.failedBody}</p>

        <div className="mt-7 space-y-2.5">
          <ButtonLink href={p(`/courses/${purchase.course.slug}`)} size="lg" fullWidth>
            {t.checkout.tryAgain}
          </ButtonLink>
          <ButtonLink href={p("/courses")} variant="outline" size="lg" fullWidth>
            {t.dashboard.browseCourses}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

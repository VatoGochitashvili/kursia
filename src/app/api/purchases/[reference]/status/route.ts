import { db } from "@/lib/db";
import { handler, jsonOk, notFoundError } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authoritative purchase status, scoped to the buyer. */
export const GET = handler(
  async (_request, context: { params: Promise<{ reference: string }> }) => {
    const user = await requireUser();
    const { reference } = await context.params;

    const purchase = await db.purchase.findUnique({
      where: { reference },
      select: {
        userId: true,
        status: true,
        course: { select: { slug: true } },
        enrollment: { select: { revokedAt: true } },
      },
    });
    if (!purchase || purchase.userId !== user.id) throw notFoundError();

    return jsonOk({
      status: purchase.status,
      courseSlug: purchase.course.slug,
      hasAccess: Boolean(purchase.enrollment && !purchase.enrollment.revokedAt),
    });
  },
);

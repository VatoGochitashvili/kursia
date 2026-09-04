import { notFound } from "next/navigation";
import { db } from "@/lib/db";

/**
 * Loads a purchase for the post-payment screens.
 *
 * These pages ALWAYS re-read the authoritative purchase row. A provider's
 * "success" redirect is only a hint about where the browser should land — it
 * is never treated as proof of payment, so a hand-crafted /complete URL shows
 * "processing", not access.
 */
export async function getPurchaseForViewer(reference: string, userId: string) {
  const purchase = await db.purchase.findUnique({
    where: { reference },
    select: {
      id: true, reference: true, userId: true, status: true,
      amountMinor: true, currency: true, createdAt: true, paidAt: true,
      course: { select: { id: true, slug: true, title: true, thumbnailUrl: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { provider: true, status: true, failureMessage: true },
      },
      enrollment: { select: { id: true, revokedAt: true } },
    },
  });

  // A purchase is only ever visible to the person who made it.
  if (!purchase || purchase.userId !== userId) notFound();
  return purchase;
}

export type PurchaseView = Awaited<ReturnType<typeof getPurchaseForViewer>>;

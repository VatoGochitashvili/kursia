import { z } from "zod";
import { db } from "@/lib/db";
import {
  beginMutation, conflict, handler, jsonCreated, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { requireCreator, requireUser } from "@/lib/auth/rbac";
import { COUPON_MESSAGES, evaluateCoupon, normaliseCode } from "@/lib/coupons";
import { effectivePriceMinor } from "@/lib/money";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Discount codes: the creator's own list, and a buyer's preview of one.
 *
 * The preview (POST ?preview=1) and the checkout both call `evaluateCoupon`,
 * so the figure a buyer is shown is produced by the same code that will
 * charge them. Quoting one price and charging another is the failure mode a
 * discount system cannot have.
 */

const createSchema = z
  .object({
    code: z.string().trim().min(3, "მინიმუმ 3 სიმბოლო").max(40),
    courseId: z.union([cuid, z.literal("")]).optional(),
    discountType: z.enum(["PERCENT", "FIXED"]),
    /** Percent 1-100, or major currency units for FIXED. */
    discountValue: z.number().min(1).max(100000),
    maxRedemptions: z.number().int().min(1).max(100000).nullable().optional(),
    expiresAt: z.string().trim().max(40).nullable().optional(),
  })
  .strict()
  .refine((v) => v.discountType !== "PERCENT" || v.discountValue <= 100, {
    message: "პროცენტი არ უნდა აღემატებოდეს 100-ს",
    path: ["discountValue"],
  });

/** The creator's own codes. */
export const GET = handler(async () => {
  const creator = await requireCreator();

  const coupons = await db.coupon.findMany({
    where: { creatorId: creator.creatorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, code: true, discountType: true, discountValue: true,
      maxRedemptions: true, redeemedCount: true, expiresAt: true, isActive: true,
      course: { select: { id: true, title: true } },
    },
  });

  return jsonOk({ coupons });
});

const previewSchema = z.object({ code: z.string().trim().min(1).max(40), courseId: cuid }).strict();

export const POST = handler(async (request) => {
  const url = new URL(request.url);

  // ── A buyer checking what a code is worth ───────────────────────────────
  if (url.searchParams.get("preview") === "1") {
    const user = await requireUser();
    const body = await readJson(request, previewSchema);

    const course = await db.course.findUnique({
      where: { id: body.courseId },
      select: {
        id: true, creatorId: true, currency: true,
        priceMinor: true, discountPriceMinor: true,
      },
    });
    if (!course) throw notFoundError("კურსი ვერ მოიძებნა");

    const result = await evaluateCoupon({
      code: body.code,
      userId: user.id,
      courseId: course.id,
      creatorId: course.creatorId,
      priceMinor: effectivePriceMinor(course.priceMinor, course.discountPriceMinor),
    });

    return jsonOk({
      ok: result.ok,
      message: result.problem ? COUPON_MESSAGES[result.problem].ka : null,
      discountMinor: result.discountMinor,
      finalMinor: result.finalMinor,
      currency: course.currency,
    });
  }

  // ── A creator issuing one ───────────────────────────────────────────────
  const creator = await requireCreator();
  await beginMutation("write", creator.id);
  const body = await readJson(request, createSchema);

  // Scoping to a course means scoping to one of YOUR courses. Without this a
  // creator could mint a code against a rival's listing.
  if (body.courseId) {
    const owned = await db.course.count({
      where: { id: body.courseId, creatorId: creator.creatorId },
    });
    if (owned === 0) throw notFoundError("კურსი ვერ მოიძებნა");
  }

  const code = normaliseCode(body.code);
  const taken = await db.coupon.count({ where: { code } });
  if (taken > 0) throw conflict("ასეთი კოდი უკვე არსებობს");

  const coupon = await db.coupon.create({
    data: {
      code,
      creatorId: creator.creatorId,
      courseId: body.courseId || null,
      discountType: body.discountType,
      // FIXED arrives in major units, like every other price in the UI.
      discountValue:
        body.discountType === "FIXED"
          ? Math.round(body.discountValue * 100)
          : Math.round(body.discountValue),
      maxRedemptions: body.maxRedemptions ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
    select: { id: true, code: true },
  });

  return jsonCreated({ coupon });
});

const updateSchema = z.object({ id: cuid, isActive: z.boolean() }).strict();

export const PATCH = handler(async (request) => {
  const creator = await requireCreator();
  await beginMutation("write", creator.id);
  const body = await readJson(request, updateSchema);

  // Scoped to this creator, so an id from elsewhere cannot be toggled.
  const result = await db.coupon.updateMany({
    where: { id: body.id, creatorId: creator.creatorId },
    data: { isActive: body.isActive },
  });
  if (result.count === 0) throw notFoundError("კოდი ვერ მოიძებნა");

  return jsonOk({ ok: true });
});

export const DELETE = handler(async (request) => {
  const creator = await requireCreator();
  await beginMutation("write", creator.id);

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const result = await db.coupon.deleteMany({ where: { id, creatorId: creator.creatorId } });
  if (result.count === 0) throw notFoundError("კოდი ვერ მოიძებნა");

  return jsonOk({ ok: true });
});

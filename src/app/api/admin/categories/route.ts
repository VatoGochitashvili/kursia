import { db } from "@/lib/db";
import {
  ApiError, beginMutation, conflict, handler, jsonCreated, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { categorySchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/rbac";
import { uniqueSlug } from "@/lib/slug";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Category management.
 *
 * Categories are pure data — nothing in the UI hard-codes them, so adding
 * "Robotics" here makes it appear in navigation, filters, the homepage grid
 * and the sitemap without a deploy.
 */
export const POST = handler(async (request) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const body = await readJson(request, categorySchema);

  // The slug is derived from the Georgian name (transliterated) unless the
  // admin supplies one explicitly.
  const slug =
    body.slug ??
    (await uniqueSlug(
      body.nameKa,
      async (candidate) => (await db.category.count({ where: { slug: candidate } })) > 0,
      { maxLength: 60, fallbackPrefix: "category" },
    ));

  const last = await db.category.findFirst({
    where: { parentId: body.parentId || null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const category = await db.category.create({
    data: {
      slug,
      nameKa: body.nameKa,
      nameEn: body.nameEn,
      descriptionKa: body.descriptionKa || null,
      descriptionEn: body.descriptionEn || null,
      icon: body.icon || null,
      colorHex: body.colorHex || null,
      parentId: body.parentId || null,
      sortOrder: body.sortOrder ?? (last?.sortOrder ?? -1) + 1,
      isActive: body.isActive ?? true,
    },
    select: { id: true, slug: true, nameKa: true, nameEn: true },
  });

  await audit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.CATEGORY_CREATED,
    targetType: "Category",
    targetId: category.id,
    summary: category.nameKa,
  });

  return jsonCreated(category);
});

export const PATCH = handler(async (request) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const existing = await db.category.findUnique({
    where: { id },
    select: { id: true, nameKa: true, parentId: true },
  });
  if (!existing) throw notFoundError("კატეგორია ვერ მოიძებნა");

  const body = await readJson(request, categorySchema.partial());

  // A category cannot be its own parent, nor its own child's child.
  if (body.parentId) {
    if (body.parentId === id) throw conflict("კატეგორია ვერ იქნება საკუთარი თავის მშობელი");
    const child = await db.category.findFirst({
      where: { id: body.parentId, parentId: id },
      select: { id: true },
    });
    if (child) throw conflict("ციკლური იერარქია დაუშვებელია");
  }

  const category = await db.category.update({
    where: { id },
    data: {
      nameKa: body.nameKa,
      nameEn: body.nameEn,
      descriptionKa: body.descriptionKa === "" ? null : body.descriptionKa,
      descriptionEn: body.descriptionEn === "" ? null : body.descriptionEn,
      icon: body.icon === "" ? null : body.icon,
      colorHex: body.colorHex === "" ? null : body.colorHex,
      parentId: body.parentId === "" ? null : body.parentId,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    },
    select: { id: true, slug: true, nameKa: true, nameEn: true, isActive: true },
  });

  await audit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.CATEGORY_UPDATED,
    targetType: "Category",
    targetId: id,
    summary: category.nameKa,
  });

  return jsonOk(category);
});

/**
 * Delete a category.
 *
 * Refused while courses still point at it — silently orphaning published
 * courses would break navigation and their breadcrumbs. Deactivate instead.
 */
export const DELETE = handler(async (request) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const id = new URL(request.url).searchParams.get("id") ?? "";

  const category = await db.category.findUnique({
    where: { id },
    select: {
      nameKa: true,
      _count: { select: { courses: true, subCourses: true, children: true } },
    },
  });
  if (!category) throw notFoundError();

  const inUse = category._count.courses + category._count.subCourses;
  if (inUse > 0) {
    throw new ApiError(
      409,
      "CATEGORY_IN_USE",
      `${inUse} კურსი იყენებს ამ კატეგორიას. გამორთეთ ის წაშლის ნაცვლად.`,
    );
  }
  if (category._count.children > 0) {
    throw new ApiError(409, "HAS_CHILDREN", "ჯერ წაშალეთ ქვეკატეგორიები");
  }

  await db.category.delete({ where: { id } });
  await audit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.CATEGORY_DELETED,
    targetType: "Category",
    targetId: id,
    summary: category.nameKa,
  });

  return jsonOk({ ok: true });
});

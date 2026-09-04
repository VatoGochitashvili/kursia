import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { z } from "zod";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

const bodySchema = z.object({ courseId: cuid }).strict();

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { courseId } = await readJson(request, bodySchema);

  await db.wishlist
    .create({ data: { userId: user.id, courseId } })
    // Adding twice is a no-op, not an error.
    .catch(() => undefined);

  return jsonOk({ ok: true, wishlisted: true });
});

export const DELETE = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const courseId = new URL(request.url).searchParams.get("courseId") ?? "";

  await db.wishlist.deleteMany({ where: { userId: user.id, courseId } });
  return jsonOk({ ok: true, wishlisted: false });
});

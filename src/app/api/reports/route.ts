import { db } from "@/lib/db";
import { beginMutation, conflict, handler, jsonCreated, readJson } from "@/lib/api";
import { reportSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth/rbac";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * User-submitted report of a review, comment, course or user.
 *
 * Rate-limited and deduplicated per reporter+target, so the queue cannot be
 * flooded by one person repeatedly reporting the same thing.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("comment", user.id);
  const body = await readJson(request, reportSchema);

  const existing = await db.report.findFirst({
    where: {
      reporterId: user.id,
      targetType: body.targetType,
      targetId: body.targetId,
      status: { in: ["OPEN", "REVIEWING"] },
    },
    select: { id: true },
  });
  if (existing) throw conflict("თქვენ უკვე გააგზავნეთ საჩივარი ამ შინაარსზე");

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      details: body.details ?? null,
    },
    select: { id: true, status: true },
  });

  const admins = await db.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      notify({
        userId: admin.id,
        type: "NEW_COMMENT",
        title: "ახალი საჩივარი",
        body: `${body.targetType}: ${body.reason}`,
        linkUrl: "/admin/reports",
      }),
    ),
  );

  return jsonCreated(report);
});

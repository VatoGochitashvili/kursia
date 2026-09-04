import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/rbac";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    status: z.enum(["REVIEWING", "ACTIONED", "DISMISSED"]),
    resolution: z.string().trim().max(1000).optional(),
  })
  .strict();

/** Resolve a report. */
export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const { id } = await context.params;

  const report = await db.report.findUnique({
    where: { id },
    select: { id: true, targetType: true, targetId: true, reason: true },
  });
  if (!report) throw notFoundError("საჩივარი ვერ მოიძებნა");

  const body = await readJson(request, bodySchema);

  await db.report.update({
    where: { id },
    data: {
      status: body.status,
      resolution: body.resolution ?? null,
      handlerId: admin.id,
    },
  });

  await audit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.REPORT_RESOLVED,
    targetType: "Report",
    targetId: id,
    summary: `${report.targetType} — ${body.status}`,
    metadata: { reason: report.reason, resolution: body.resolution },
  });

  return jsonOk({ ok: true, status: body.status });
});

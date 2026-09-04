import { headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { serializeObject } from "@/lib/json";

/**
 * Append-only audit trail for privileged actions. Every admin mutation and
 * every money-moving event writes a row here. Logging must never break the
 * operation it describes, so failures are swallowed after being surfaced.
 */

export const AUDIT_ACTIONS = {
  USER_ROLE_CHANGED: "user.role_changed",
  USER_SUSPENDED: "user.suspended",
  USER_REINSTATED: "user.reinstated",
  USER_DELETED: "user.deleted",
  CREATOR_VERIFIED: "creator.verified",
  CREATOR_UNVERIFIED: "creator.unverified",
  CREATOR_COMMISSION_SET: "creator.commission_set",
  COURSE_STATUS_CHANGED: "course.status_changed",
  COURSE_FEATURED: "course.featured",
  COURSE_DELETED: "course.deleted",
  CATEGORY_CREATED: "category.created",
  CATEGORY_UPDATED: "category.updated",
  CATEGORY_DELETED: "category.deleted",
  SETTINGS_UPDATED: "settings.updated",
  PURCHASE_PAID: "purchase.paid",
  PURCHASE_FAILED: "purchase.failed",
  ENROLLMENT_GRANTED: "enrollment.granted",
  ENROLLMENT_REVOKED: "enrollment.revoked",
  REFUND_REQUESTED: "refund.requested",
  REFUND_PROCESSED: "refund.processed",
  REFUND_REJECTED: "refund.rejected",
  PAYOUT_REQUESTED: "payout.requested",
  PAYOUT_STATUS_CHANGED: "payout.status_changed",
  REVIEW_MODERATED: "review.moderated",
  COMMENT_MODERATED: "comment.moderated",
  REPORT_RESOLVED: "report.resolved",
  WEBHOOK_REJECTED: "webhook.rejected",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditInput {
  actorId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      const fwd = h.get("x-forwarded-for");
      ip = env.TRUST_PROXY && fwd ? fwd.split(",")[0]!.trim() : null;
      userAgent = h.get("user-agent")?.slice(0, 400) ?? null;
    } catch {
      // Outside a request scope (cron, seed) — no request metadata to record.
    }

    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        summary: input.summary ?? null,
        metadata: serializeObject(input.metadata),
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", input.action, error);
  }
}

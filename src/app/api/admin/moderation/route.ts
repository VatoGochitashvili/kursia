import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, handler, jsonOk, notFoundError, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/rbac";
import { refreshCourseRating } from "@/lib/progress";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    targetType: z.enum(["REVIEW", "COMMENT", "COURSE"]),
    targetId: cuid,
    action: z.enum(["HIDE", "RESTORE", "REMOVE", "FEATURE", "UNFEATURE"]),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

/** Moderate a review, a comment, or a course's featured flag. */
export const POST = handler(async (request) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);
  const body = await readJson(request, bodySchema);

  const status =
    body.action === "HIDE" ? "HIDDEN" : body.action === "REMOVE" ? "REMOVED" : "VISIBLE";

  switch (body.targetType) {
    case "REVIEW": {
      const review = await db.review.findUnique({
        where: { id: body.targetId },
        select: { courseId: true },
      });
      if (!review) throw notFoundError();

      await db.review.update({ where: { id: body.targetId }, data: { status } });
      // Hidden reviews must stop counting toward the course rating.
      await refreshCourseRating(review.courseId);

      await audit({
        actorId: admin.id,
        action: AUDIT_ACTIONS.REVIEW_MODERATED,
        targetType: "Review",
        targetId: body.targetId,
        summary: `${body.action}${body.note ? `: ${body.note}` : ""}`,
      });
      return jsonOk({ ok: true, status });
    }

    case "COMMENT": {
      await db.comment.update({ where: { id: body.targetId }, data: { status } });
      await audit({
        actorId: admin.id,
        action: AUDIT_ACTIONS.COMMENT_MODERATED,
        targetType: "Comment",
        targetId: body.targetId,
        summary: `${body.action}${body.note ? `: ${body.note}` : ""}`,
      });
      return jsonOk({ ok: true, status });
    }

    case "COURSE": {
      const featured = body.action === "FEATURE";
      const course = await db.course.update({
        where: { id: body.targetId },
        data: {
          isFeatured: featured,
          featuredRank: featured ? 0 : null,
        },
        select: { id: true, title: true, isFeatured: true },
      });
      await audit({
        actorId: admin.id,
        action: AUDIT_ACTIONS.COURSE_FEATURED,
        targetType: "Course",
        targetId: body.targetId,
        summary: `${course.title}: ${featured ? "featured" : "unfeatured"}`,
      });
      return jsonOk({ ok: true, isFeatured: course.isFeatured });
    }
  }
});

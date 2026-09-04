import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { uniqueSlug } from "@/lib/slug";
import { serializeStringArray } from "@/lib/json";
import { toMinor } from "@/lib/money";
import { canTransitionCourse, type CourseStatus } from "@/lib/enums";
import { refreshCourseAggregates } from "@/lib/progress";
import { notify, absoluteUrl } from "@/lib/notifications";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { ApiError, badRequest, conflict, notFoundError } from "@/lib/api";

/**
 * Course authoring + the moderation workflow.
 *
 * The state machine lives in `COURSE_TRANSITIONS` (src/lib/enums.ts) and is
 * enforced here, so a creator cannot jump straight to PUBLISHED and an admin
 * cannot skip a step by crafting a request.
 */

export async function createCourse(input: {
  creatorId: string;
  title: string;
  categoryId?: string;
  language: string;
}) {
  const settings = await getSettings();

  const slug = await uniqueSlug(
    input.title,
    async (candidate) => (await db.course.count({ where: { slug: candidate } })) > 0,
    { maxLength: 80, fallbackPrefix: "course" },
  );

  const course = await db.course.create({
    data: {
      slug,
      title: input.title,
      creatorId: input.creatorId,
      categoryId: input.categoryId || null,
      language: input.language,
      currency: settings.currency,
      status: "DRAFT",
      // A brand-new course starts with one empty module so the builder is
      // never a blank page.
      modules: { create: [{ title: "მოდული 1", sortOrder: 0 }] },
    },
    select: { id: true, slug: true, title: true, status: true },
  });

  await db.course.update({ where: { id: course.id }, data: { moduleCount: 1 } });
  return course;
}

export interface UpdateCourseInput {
  title?: string;
  subtitle?: string;
  description?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  categoryId?: string;
  subcategoryId?: string;
  language?: string;
  level?: string;
  price?: number;
  discountPrice?: number | null;
  learningOutcomes?: string[];
  requirements?: string[];
  targetAudience?: string[];
  hasCertificate?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  faqs?: { question: string; answer: string }[];
}

export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  const existing = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true, currency: true, status: true },
  });
  if (!existing) throw notFoundError("კურსი ვერ მოიძებნა");

  // Re-slug on a title change, but only while the course has never been
  // public — changing a live URL would break inbound links and rankings.
  let slug: string | undefined;
  if (input.title && input.title !== existing.title && existing.status === "DRAFT") {
    slug = await uniqueSlug(
      input.title,
      async (candidate) =>
        (await db.course.count({ where: { slug: candidate, NOT: { id: courseId } } })) > 0,
      { maxLength: 80, fallbackPrefix: "course" },
    );
  }

  const empty = (v: string | undefined) => (v === undefined ? undefined : v === "" ? null : v);

  const course = await db.course.update({
    where: { id: courseId },
    data: {
      ...(slug ? { slug } : {}),
      title: input.title,
      subtitle: empty(input.subtitle),
      description: empty(input.description),
      thumbnailUrl: empty(input.thumbnailUrl),
      previewVideoUrl: empty(input.previewVideoUrl),
      categoryId: input.categoryId === "" ? null : input.categoryId,
      subcategoryId: input.subcategoryId === "" ? null : input.subcategoryId,
      language: input.language,
      level: input.level,
      ...(input.price !== undefined
        ? { priceMinor: toMinor(input.price, existing.currency) }
        : {}),
      ...(input.discountPrice !== undefined
        ? {
            discountPriceMinor:
              input.discountPrice === null ? null : toMinor(input.discountPrice, existing.currency),
          }
        : {}),
      ...(input.learningOutcomes !== undefined
        ? { learningOutcomes: serializeStringArray(input.learningOutcomes) }
        : {}),
      ...(input.requirements !== undefined
        ? { requirements: serializeStringArray(input.requirements) }
        : {}),
      ...(input.targetAudience !== undefined
        ? { targetAudience: serializeStringArray(input.targetAudience) }
        : {}),
      hasCertificate: input.hasCertificate,
      metaTitle: empty(input.metaTitle),
      metaDescription: empty(input.metaDescription),
    },
    select: { id: true, slug: true, title: true, status: true },
  });

  // FAQs are replaced wholesale — the editor sends the full ordered list.
  if (input.faqs) {
    await db.$transaction([
      db.courseFaq.deleteMany({ where: { courseId } }),
      db.courseFaq.createMany({
        data: input.faqs.map((faq, index) => ({
          courseId,
          question: faq.question,
          answer: faq.answer,
          sortOrder: index,
        })),
      }),
    ]);
  }

  return course;
}

/** Everything a course must have before it can be submitted for review. */
export interface ReadinessIssue {
  field: string;
  message: string;
}

export async function checkPublishReadiness(courseId: string): Promise<ReadinessIssue[]> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      title: true, subtitle: true, description: true, thumbnailUrl: true,
      categoryId: true, learningOutcomes: true,
      modules: {
        select: {
          id: true,
          lessons: { where: { isPublished: true }, select: { id: true, type: true, assetKey: true, textContent: true } },
        },
      },
    },
  });
  if (!course) throw notFoundError("კურსი ვერ მოიძებნა");

  const issues: ReadinessIssue[] = [];
  const push = (field: string, message: string) => issues.push({ field, message });

  if (!course.subtitle?.trim()) push("subtitle", "დაამატეთ ქვესათაური");
  if ((course.description ?? "").trim().length < 100) {
    push("description", "აღწერა უნდა იყოს მინიმუმ 100 სიმბოლო");
  }
  if (!course.thumbnailUrl) push("thumbnailUrl", "ატვირთეთ კურსის ფოტო");
  if (!course.categoryId) push("categoryId", "აირჩიეთ კატეგორია");

  const outcomes = course.learningOutcomes ? JSON.parse(course.learningOutcomes) : [];
  if (!Array.isArray(outcomes) || outcomes.length < 3) {
    push("learningOutcomes", "დაამატეთ მინიმუმ 3 სასწავლო შედეგი");
  }

  const lessons = course.modules.flatMap((m) => m.lessons);
  if (lessons.length < 3) push("curriculum", "დაამატეთ მინიმუმ 3 გაკვეთილი");

  // A lesson with no content at all would be a dead end for a paying student.
  const emptyLessons = lessons.filter(
    (l) =>
      (l.type === "VIDEO" && !l.assetKey) ||
      (l.type === "TEXT" && !l.textContent?.trim()) ||
      ((l.type === "PDF" || l.type === "FILE") && !l.assetKey),
  );
  if (emptyLessons.length > 0) {
    push("curriculum", `${emptyLessons.length} გაკვეთილს არ აქვს შიგთავსი`);
  }

  return issues;
}

/**
 * Move a course through the moderation workflow.
 * `actorRole` decides which transitions are permitted at all.
 */
export async function transitionCourse(input: {
  courseId: string;
  to: CourseStatus;
  actorId: string;
  actorRole: string;
  note?: string;
}) {
  const settings = await getSettings();

  const course = await db.course.findUnique({
    where: { id: input.courseId },
    select: {
      id: true, slug: true, title: true, status: true, publishedAt: true,
      creator: { select: { id: true, userId: true } },
    },
  });
  if (!course) throw notFoundError("კურსი ვერ მოიძებნა");

  const from = course.status as CourseStatus;
  const isAdmin = input.actorRole === "ADMIN";

  // Admin-only destinations. A creator may submit and unpublish; only an
  // administrator approves, rejects or requests changes.
  const adminOnly: CourseStatus[] = ["APPROVED", "REJECTED", "CHANGES_REQUESTED", "UNDER_REVIEW"];
  if (adminOnly.includes(input.to) && !isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "ამ მოქმედების უფლება არ გაქვთ");
  }

  // With moderation enabled, a creator cannot self-publish.
  if (input.to === "PUBLISHED" && !isAdmin && settings.courseApprovalRequired && from !== "APPROVED") {
    throw new ApiError(
      403,
      "APPROVAL_REQUIRED",
      "კურსის გამოქვეყნება შესაძლებელია მხოლოდ ადმინის დამტკიცების შემდეგ",
    );
  }

  if (!canTransitionCourse(from, input.to)) {
    throw conflict(`სტატუსის შეცვლა ${from} → ${input.to} დაუშვებელია`);
  }

  // Submitting is gated on the readiness checklist.
  if (input.to === "SUBMITTED") {
    const issues = await checkPublishReadiness(course.id);
    if (issues.length > 0) {
      throw badRequest(
        "კურსი ჯერ არ არის მზად განხილვისთვის",
        Object.fromEntries(issues.map((i) => [i.field, [i.message]])),
      );
    }
  }

  // A rejection must explain itself — the creator sees this text.
  if ((input.to === "REJECTED" || input.to === "CHANGES_REQUESTED") && !input.note?.trim()) {
    throw badRequest("მიზეზის მითითება სავალდებულოა", { note: ["მიზეზი სავალდებულოა"] });
  }

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.course.update({
      where: { id: course.id },
      data: {
        status: input.to,
        ...(input.to === "SUBMITTED" ? { submittedAt: now } : {}),
        ...(adminOnly.includes(input.to) ? { reviewedAt: now, reviewerNote: input.note ?? null } : {}),
        ...(input.to === "PUBLISHED"
          ? { publishedAt: course.publishedAt ?? now, reviewerNote: null }
          : {}),
      },
      select: { id: true, slug: true, status: true, title: true },
    });

    await tx.courseReviewEvent.create({
      data: {
        courseId: course.id,
        fromStatus: from,
        toStatus: input.to,
        actorId: input.actorId,
        note: input.note ?? null,
      },
    });

    return result;
  });

  await refreshCourseAggregates(course.id);

  await audit({
    actorId: input.actorId,
    action: AUDIT_ACTIONS.COURSE_STATUS_CHANGED,
    targetType: "Course",
    targetId: course.id,
    summary: `${course.title}: ${from} → ${input.to}`,
    metadata: { note: input.note },
  });

  await notifyTransition({
    to: input.to,
    course: { id: course.id, slug: updated.slug, title: course.title },
    creatorUserId: course.creator.userId,
    actorId: input.actorId,
    note: input.note,
  });

  return updated;
}

async function notifyTransition(input: {
  to: CourseStatus;
  course: { id: string; slug: string; title: string };
  creatorUserId: string;
  actorId: string;
  note?: string;
}) {
  const courseUrl = `/dashboard/creator/courses/${input.course.id}`;

  switch (input.to) {
    case "SUBMITTED": {
      // Tell every administrator there is something in the review queue.
      const admins = await db.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });
      await Promise.all(
        admins.map((admin) =>
          notify({
            userId: admin.id,
            type: "COURSE_SUBMITTED",
            title: "ახალი კურსი განსახილველად",
            body: input.course.title,
            linkUrl: `/admin/courses?status=SUBMITTED`,
          }),
        ),
      );
      return;
    }
    case "PUBLISHED":
      await notify({
        userId: input.creatorUserId,
        type: "COURSE_PUBLISHED",
        title: "კურსი გამოქვეყნებულია",
        body: input.course.title,
        linkUrl: `/courses/${input.course.slug}`,
        email: {
          template: "courseApproved",
          payload: {
            courseTitle: input.course.title,
            url: absoluteUrl(`/courses/${input.course.slug}`),
          },
        },
      });
      return;
    case "APPROVED":
      await notify({
        userId: input.creatorUserId,
        type: "COURSE_APPROVED",
        title: "კურსი დამტკიცდა",
        body: input.course.title,
        linkUrl: courseUrl,
      });
      return;
    case "REJECTED":
    case "CHANGES_REQUESTED":
      await notify({
        userId: input.creatorUserId,
        type: input.to === "REJECTED" ? "COURSE_REJECTED" : "COURSE_CHANGES_REQUESTED",
        title:
          input.to === "REJECTED" ? "კურსი უარყოფილია" : "კურსი საჭიროებს ცვლილებებს",
        body: input.note ?? "",
        linkUrl: courseUrl,
        email: {
          template: "courseRejected",
          payload: {
            courseTitle: input.course.title,
            reason: input.note ?? "",
            url: absoluteUrl(courseUrl),
          },
        },
      });
      return;
    default:
      return;
  }
}

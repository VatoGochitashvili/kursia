import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { humanCode, sign } from "@/lib/crypto";
import { notify, absoluteUrl } from "@/lib/notifications";

/**
 * Certificates are issued by the server only when the enrolment shows 100%
 * progress. Each carries a public, human-transcribable code plus a
 * `serialHash` — an HMAC over the certificate's own fields — so the public
 * verification page can prove the record was not edited after issue.
 */

export function computeSerialHash(input: {
  code: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: Date;
}): string {
  const canonical = [
    input.code,
    input.studentName.trim(),
    input.courseTitle.trim(),
    input.instructorName.trim(),
    input.issuedAt.toISOString(),
  ].join("|");
  return sign(canonical, env.CERTIFICATE_SIGNING_SECRET);
}

/** Issue (or return the existing) certificate for a completed course. */
export async function issueCertificate(
  userId: string,
  courseId: string,
): Promise<{ code: string; created: boolean } | null> {
  const existing = await db.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { code: true },
  });
  if (existing) return { code: existing.code, created: false };

  const [enrollment, course, user] = await Promise.all([
    db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { progressPercent: true, revokedAt: true },
    }),
    db.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        slug: true,
        hasCertificate: true,
        creator: { select: { displayName: true } },
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { fullName: true } }, email: true },
    }),
  ]);

  // Every one of these is a hard requirement — a certificate is a claim about
  // the student, so it is never issued optimistically.
  if (!enrollment || enrollment.revokedAt || enrollment.progressPercent < 100) return null;
  if (!course?.hasCertificate || !user) return null;

  const studentName = user.profile?.fullName ?? user.email.split("@")[0]!;
  const issuedAt = new Date();

  // Retry on the astronomically unlikely code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = humanCode("KRS", 2, 4);
    try {
      await db.certificate.create({
        data: {
          code,
          userId,
          courseId,
          studentName,
          courseTitle: course.title,
          instructorName: course.creator.displayName,
          issuedAt,
          serialHash: computeSerialHash({
            code,
            studentName,
            courseTitle: course.title,
            instructorName: course.creator.displayName,
            issuedAt,
          }),
        },
      });

      await notify({
        userId,
        type: "CERTIFICATE_ISSUED",
        title: "სერტიფიკატი გაცემულია",
        body: course.title,
        linkUrl: `/certificate/${code}`,
        email: {
          template: "certificateIssued",
          payload: {
            courseTitle: course.title,
            code,
            url: absoluteUrl(`/certificate/${code}`),
          },
        },
      });

      return { code, created: true };
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") continue; // code taken
      throw error;
    }
  }
  return null;
}

export interface CertificateVerification {
  valid: boolean;
  reason?: "NOT_FOUND" | "REVOKED" | "TAMPERED";
  certificate?: {
    code: string;
    studentName: string;
    courseTitle: string;
    instructorName: string;
    issuedAt: Date;
    courseSlug: string | null;
    fingerprint: string;
  };
}

/** Public verification — no authentication, safe to expose. */
export async function verifyCertificate(code: string): Promise<CertificateVerification> {
  const normalized = code.trim().toUpperCase();
  const cert = await db.certificate.findUnique({
    where: { code: normalized },
    select: {
      code: true, studentName: true, courseTitle: true, instructorName: true,
      issuedAt: true, revokedAt: true, serialHash: true,
      course: { select: { slug: true, status: true } },
    },
  });

  if (!cert) return { valid: false, reason: "NOT_FOUND" };
  if (cert.revokedAt) return { valid: false, reason: "REVOKED" };

  const expected = computeSerialHash({
    code: cert.code,
    studentName: cert.studentName,
    courseTitle: cert.courseTitle,
    instructorName: cert.instructorName,
    issuedAt: cert.issuedAt,
  });
  if (expected !== cert.serialHash) return { valid: false, reason: "TAMPERED" };

  return {
    valid: true,
    certificate: {
      code: cert.code,
      studentName: cert.studentName,
      courseTitle: cert.courseTitle,
      instructorName: cert.instructorName,
      issuedAt: cert.issuedAt,
      courseSlug: cert.course.status === "PUBLISHED" ? cert.course.slug : null,
      // Short, displayable digest so two people can compare a certificate
      // by eye without exposing the signing secret.
      fingerprint: createHash("sha256").update(cert.serialHash).digest("hex").slice(0, 16).toUpperCase(),
    },
  };
}

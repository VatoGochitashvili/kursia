/**
 * The schema stores these as String columns (SQLite/Postgres portability), so
 * this file is the single authority on legal values. Always validate through
 * the `is*` guards before writing user input to an "enum" column.
 */

export const USER_ROLES = ["STUDENT", "CREATOR", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "DELETED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const COURSE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "REJECTED",
  "APPROVED",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** Statuses whose course pages are publicly visible and indexable. */
export const PUBLIC_COURSE_STATUSES: CourseStatus[] = ["PUBLISHED"];

/**
 * Allowed moderation transitions. The API refuses anything not listed here,
 * so the workflow cannot be short-circuited by a crafted request.
 */
export const COURSE_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  DRAFT: ["SUBMITTED", "ARCHIVED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "DRAFT"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"],
  CHANGES_REQUESTED: ["SUBMITTED", "DRAFT", "ARCHIVED"],
  REJECTED: ["SUBMITTED", "DRAFT", "ARCHIVED"],
  APPROVED: ["PUBLISHED", "CHANGES_REQUESTED", "DRAFT"],
  PUBLISHED: ["UNPUBLISHED", "CHANGES_REQUESTED"],
  UNPUBLISHED: ["PUBLISHED", "DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export const COURSE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const LESSON_TYPES = ["VIDEO", "TEXT", "PDF", "FILE", "QUIZ", "ASSIGNMENT"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const PURCHASE_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const TRANSACTION_STATUSES = [
  "CREATED",
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const REFUND_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PROCESSED",
  "FAILED",
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const PAYOUT_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "PROCESSING",
  "PAID",
  "REJECTED",
  "FAILED",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const BALANCE_ENTRY_TYPES = [
  "SALE",
  "PLATFORM_FEE",
  "PROCESSING_FEE",
  "REFUND",
  "CLEARED",
  "PAYOUT",
  "ADJUSTMENT",
] as const;
export type BalanceEntryType = (typeof BALANCE_ENTRY_TYPES)[number];

export const ENROLLMENT_SOURCES = ["PURCHASE", "FREE", "ADMIN_GRANT"] as const;
export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number];

export const MODERATION_STATUSES = ["VISIBLE", "HIDDEN", "REMOVED"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const REPORT_TARGET_TYPES = ["REVIEW", "COMMENT", "COURSE", "USER"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ["OPEN", "REVIEWING", "ACTIONED", "DISMISSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "COURSE_PURCHASED",
  "COURSE_SOLD",
  "COURSE_SUBMITTED",
  "COURSE_APPROVED",
  "COURSE_REJECTED",
  "COURSE_CHANGES_REQUESTED",
  "COURSE_PUBLISHED",
  "NEW_COURSE_FROM_CREATOR",
  "NEW_REVIEW",
  "REVIEW_REPLY",
  "NEW_COMMENT",
  "COMMENT_REPLY",
  "NEW_STUDENT",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "REFUND_PROCESSED",
  "PAYOUT_REQUESTED",
  "PAYOUT_PAID",
  "PAYOUT_REJECTED",
  "CERTIFICATE_ISSUED",
  "SECURITY_PASSWORD_CHANGED",
  "SECURITY_NEW_LOGIN",
  "CREATOR_VERIFIED",
  "ACCOUNT_SUSPENDED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const LOCALES = ["ka", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ka";

function guard<T extends readonly string[]>(values: T) {
  const set = new Set<string>(values);
  return (v: unknown): v is T[number] => typeof v === "string" && set.has(v);
}

export const isUserRole = guard(USER_ROLES);
export const isUserStatus = guard(USER_STATUSES);
export const isCourseStatus = guard(COURSE_STATUSES);
export const isCourseLevel = guard(COURSE_LEVELS);
export const isLessonType = guard(LESSON_TYPES);
export const isPurchaseStatus = guard(PURCHASE_STATUSES);
export const isQuestionType = guard(QUESTION_TYPES);
export const isLocale = guard(LOCALES);
export const isNotificationType = guard(NOTIFICATION_TYPES);

export function canTransitionCourse(from: string, to: string): boolean {
  if (!isCourseStatus(from) || !isCourseStatus(to)) return false;
  return COURSE_TRANSITIONS[from].includes(to);
}

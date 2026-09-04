import { z } from "zod";
import {
  COURSE_LEVELS,
  LESSON_TYPES,
  LOCALES,
  QUESTION_TYPES,
  REPORT_TARGET_TYPES,
  USER_ROLES,
} from "@/lib/enums";

/**
 * Every byte of user input crosses one of these schemas before it reaches the
 * database. Free-text fields are length-capped; anything rendered as HTML is
 * sanitised at render time (see src/lib/sanitize.ts) rather than trusted here.
 */

// ── Primitives ─────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email("არასწორი ელფოსტის მისამართი")
  .transform((v) => v.toLowerCase());

/**
 * Password policy: length is the dominant factor in resistance to guessing,
 * so we require 10+ characters and mixed character classes rather than a
 * short password with baroque rules.
 */
export const passwordSchema = z
  .string()
  .min(10, "პაროლი უნდა შედგებოდეს მინიმუმ 10 სიმბოლოსგან")
  .max(200, "პაროლი ძალიან გრძელია")
  .refine((v) => /[a-zა-ჰ]/i.test(v), "პაროლი უნდა შეიცავდეს ასოებს")
  .refine((v) => /[0-9]/.test(v), "პაროლი უნდა შეიცავდეს ციფრს");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "მინიმუმ 3 სიმბოლო")
  .max(30, "მაქსიმუმ 30 სიმბოლო")
  .regex(/^[a-z0-9][a-z0-9._]*[a-z0-9]$/, "დასაშვებია ლათინური ასოები, ციფრები, . და _");

export const fullNameSchema = z.string().trim().min(2, "მიუთითეთ სახელი").max(120);
export const cuid = z.string().trim().min(1).max(64);
export const slugParam = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "არასწორი მისამართი");

export const localeSchema = z.enum(LOCALES);
const optionalUrl = z.union([z.string().trim().url("არასწორი ბმული"), z.literal("")]).optional();
/** Money arrives from forms as a decimal string; converted to minor units. */
export const moneyMajor = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v))
  .pipe(z.number().min(0, "ფასი არ შეიძლება იყოს ნეგატიური").max(1_000_000));

// ── Auth ───────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    /** The only two roles a visitor may self-select. ADMIN is never assignable. */
    accountType: z.enum(["STUDENT", "CREATOR"]).default("STUDENT"),
    /** Creator display name — defaults to fullName when omitted. */
    displayName: z.string().trim().max(120).optional(),
    locale: localeSchema.default("ka"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "წესებზე თანხმობა სავალდებულოა" }),
    }),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "შეიყვანეთ პაროლი").max(200),
  })
  .strict();

export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();

export const resetPasswordSchema = z
  .object({ token: z.string().min(10).max(200), password: passwordSchema })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema })
  .strict();

export const verifyEmailSchema = z.object({ token: z.string().min(10).max(200) }).strict();

// ── Profile ────────────────────────────────────────────────────────────────

export const updateProfileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(2000).optional(),
    headline: z.string().trim().max(160).optional(),
    city: z.string().trim().max(80).optional(),
    phone: z.string().trim().max(32).optional(),
    avatarUrl: optionalUrl,
    websiteUrl: optionalUrl,
    facebookUrl: optionalUrl,
    youtubeUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    instagramUrl: optionalUrl,
    locale: localeSchema.optional(),
  })
  .strict();

export const updateCreatorProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120).optional(),
    instructorBio: z.string().trim().max(4000).optional(),
    expertise: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    legalName: z.string().trim().max(160).optional(),
    taxId: z.string().trim().max(40).optional(),
  })
  .strict();

export const becomeCreatorSchema = z
  .object({
    displayName: z.string().trim().min(2, "მიუთითეთ საჯარო სახელი").max(120),
    instructorBio: z.string().trim().max(4000).optional(),
    expertise: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  })
  .strict();

// ── Courses ────────────────────────────────────────────────────────────────

export const createCourseSchema = z
  .object({
    title: z.string().trim().min(5, "სათაური მინიმუმ 5 სიმბოლო").max(140),
    categoryId: cuid.optional(),
    language: z.string().trim().min(2).max(8).default("ka"),
  })
  .strict();

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(5).max(140).optional(),
    subtitle: z.string().trim().max(200).optional(),
    description: z.string().trim().max(20_000).optional(),
    thumbnailUrl: z.union([z.string().trim().max(1000), z.literal("")]).optional(),
    previewVideoUrl: z.union([z.string().trim().max(1000), z.literal("")]).optional(),
    categoryId: z.union([cuid, z.literal("")]).optional(),
    subcategoryId: z.union([cuid, z.literal("")]).optional(),
    language: z.string().trim().min(2).max(8).optional(),
    level: z.enum(COURSE_LEVELS).optional(),
    price: moneyMajor.optional(),
    discountPrice: z.union([moneyMajor, z.null()]).optional(),
    learningOutcomes: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
    requirements: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
    targetAudience: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
    hasCertificate: z.boolean().optional(),
    metaTitle: z.string().trim().max(70).optional(),
    metaDescription: z.string().trim().max(180).optional(),
    faqs: z
      .array(
        z.object({
          question: z.string().trim().min(3).max(300),
          answer: z.string().trim().min(3).max(2000),
        }),
      )
      .max(30)
      .optional(),
  })
  .strict()
  .refine(
    (v) => v.discountPrice == null || v.price == null || v.discountPrice < v.price,
    { message: "ფასდაკლებული ფასი უნდა იყოს ძირითადზე ნაკლები", path: ["discountPrice"] },
  );

export const courseTransitionSchema = z
  .object({
    to: z.enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "CHANGES_REQUESTED",
      "PUBLISHED",
      "UNPUBLISHED",
      "DRAFT",
      "ARCHIVED",
    ]),
    note: z.string().trim().max(2000).optional(),
  })
  .strict();

// ── Curriculum ─────────────────────────────────────────────────────────────

export const moduleSchema = z
  .object({
    title: z.string().trim().min(2, "მოდულის სათაური სავალდებულოა").max(160),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

export const lessonSchema = z
  .object({
    moduleId: cuid,
    title: z.string().trim().min(2, "გაკვეთილის სათაური სავალდებულოა").max(180),
    description: z.string().trim().max(4000).optional(),
    type: z.enum(LESSON_TYPES).default("VIDEO"),
    textContent: z.string().trim().max(100_000).optional(),
    isFreePreview: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    durationSeconds: z.number().int().min(0).max(60 * 60 * 24).optional(),
  })
  .strict();

export const updateLessonSchema = lessonSchema.partial().strict();

/** Explicit ordered id list — safer than sending per-item index deltas. */
export const reorderSchema = z.object({ ids: z.array(cuid).min(1).max(500) }).strict();

// ── Quizzes ────────────────────────────────────────────────────────────────

export const quizSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    instructions: z.string().trim().max(4000).optional(),
    passingScore: z.number().int().min(0).max(100).default(70),
    maxAttempts: z.number().int().min(0).max(50).default(0),
    shuffleQuestions: z.boolean().default(false),
    timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
    questions: z
      .array(
        z.object({
          id: cuid.optional(),
          prompt: z.string().trim().min(3, "შეკითხვა სავალდებულოა").max(1000),
          type: z.enum(QUESTION_TYPES).default("SINGLE_CHOICE"),
          explanation: z.string().trim().max(2000).optional(),
          points: z.number().int().min(1).max(100).default(1),
          answers: z
            .array(
              z.object({
                id: cuid.optional(),
                text: z.string().trim().min(1, "პასუხი ცარიელია").max(500),
                isCorrect: z.boolean().default(false),
              }),
            )
            .min(2, "მინიმუმ 2 პასუხი")
            .max(10),
        }),
      )
      .min(1, "დაამატეთ მინიმუმ ერთი შეკითხვა")
      .max(100),
  })
  .strict()
  .superRefine((quiz, ctx) => {
    quiz.questions.forEach((q, qi) => {
      const correct = q.answers.filter((a) => a.isCorrect).length;
      if (correct === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", qi, "answers"],
          message: "მონიშნეთ სწორი პასუხი",
        });
      }
      if (q.type !== "MULTIPLE_CHOICE" && correct > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", qi, "answers"],
          message: "ამ ტიპის შეკითხვას მხოლოდ ერთი სწორი პასუხი უნდა ჰქონდეს",
        });
      }
      if (q.type === "TRUE_FALSE" && q.answers.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", qi, "answers"],
          message: "true/false შეკითხვას ზუსტად 2 პასუხი უნდა ჰქონდეს",
        });
      }
    });
  });

export const quizSubmitSchema = z
  .object({
    answers: z
      .array(z.object({ questionId: cuid, answerIds: z.array(cuid).max(10) }))
      .min(1)
      .max(100),
  })
  .strict();

// ── Learning ───────────────────────────────────────────────────────────────

export const progressSchema = z
  .object({
    lessonId: cuid,
    positionSeconds: z.number().int().min(0).max(60 * 60 * 24).optional(),
    watchedSeconds: z.number().int().min(0).max(60 * 60 * 24).optional(),
    isCompleted: z.boolean().optional(),
  })
  .strict();

export const noteSchema = z
  .object({
    lessonId: cuid,
    body: z.string().trim().min(1, "ჩანაწერი ცარიელია").max(5000),
    positionSeconds: z.number().int().min(0).nullable().optional(),
  })
  .strict();

// ── Commerce ───────────────────────────────────────────────────────────────

export const checkoutSchema = z
  .object({ courseId: cuid, provider: z.string().trim().min(1).max(40).optional() })
  .strict();

export const refundRequestSchema = z
  .object({ purchaseId: cuid, reason: z.string().trim().min(10, "მიუთითეთ მიზეზი").max(2000) })
  .strict();

export const payoutRequestSchema = z
  .object({
    amount: moneyMajor,
    methodId: cuid.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const payoutMethodSchema = z
  .object({
    accountName: z.string().trim().min(2, "მიუთითეთ მიმღების სახელი").max(160),
    // Georgian IBAN: GE + 2 check digits + 2 bank letters + 16 digits.
    iban: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, "").toUpperCase())
      .refine((v) => /^GE\d{2}[A-Z]{2}\d{16}$/.test(v), "არასწორი ქართული IBAN (GE00XX0000000000000000)"),
    bankName: z.string().trim().max(120).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

// ── Social ─────────────────────────────────────────────────────────────────

export const reviewSchema = z
  .object({
    courseId: cuid,
    rating: z.number().int().min(1, "აირჩიეთ შეფასება").max(5),
    title: z.string().trim().max(160).optional(),
    body: z.string().trim().max(4000).optional(),
  })
  .strict();

export const commentSchema = z
  .object({
    courseId: cuid,
    lessonId: cuid.optional(),
    parentId: cuid.optional(),
    body: z.string().trim().min(1, "კომენტარი ცარიელია").max(5000),
    isQuestion: z.boolean().optional(),
  })
  .strict();

export const reportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES),
    targetId: cuid,
    reason: z.string().trim().min(3).max(200),
    details: z.string().trim().max(2000).optional(),
  })
  .strict();

// ── Discovery ──────────────────────────────────────────────────────────────

export const courseSearchSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    category: z.string().trim().max(120).optional(),
    level: z.string().trim().max(20).optional(),
    language: z.string().trim().max(8).optional(),
    price: z.enum(["all", "free", "paid"]).default("all").optional(),
    minPrice: z.coerce.number().min(0).max(1_000_000).optional(),
    maxPrice: z.coerce.number().min(0).max(1_000_000).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    sort: z
      .enum(["relevance", "popular", "newest", "rating", "price_asc", "price_desc"])
      .default("relevance")
      .optional(),
    page: z.coerce.number().int().min(1).max(500).default(1).optional(),
    perPage: z.coerce.number().int().min(1).max(48).default(12).optional(),
  })
  .strict();

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const categorySchema = z
  .object({
    nameKa: z.string().trim().min(2, "ქართული სახელი სავალდებულოა").max(80),
    nameEn: z.string().trim().min(2, "English name is required").max(80),
    slug: slugParam.optional(),
    descriptionKa: z.string().trim().max(500).optional(),
    descriptionEn: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(40).optional(),
    colorHex: z
      .union([z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "არასწორი ფერი"), z.literal("")])
      .optional(),
    parentId: z.union([cuid, z.literal("")]).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const settingsUpdateSchema = z
  .object({
    platformName: z.string().trim().min(1).max(60).optional(),
    platformNameKa: z.string().trim().min(1).max(60).optional(),
    taglineKa: z.string().trim().max(200).optional(),
    taglineEn: z.string().trim().max(200).optional(),
    logoUrl: z.string().trim().max(1000).optional(),
    supportEmail: emailSchema.optional(),
    currency: z.enum(["GEL", "USD", "EUR"]).optional(),
    /** Commission as a percentage in the UI; stored as basis points. */
    commissionPercent: z.number().min(0).max(100).optional(),
    payoutClearingDays: z.number().int().min(0).max(180).optional(),
    payoutMinimum: moneyMajor.optional(),
    refundWindowDays: z.number().int().min(0).max(365).optional(),
    courseApprovalRequired: z.boolean().optional(),
    registrationOpen: z.boolean().optional(),
    creatorRegistrationOpen: z.boolean().optional(),
    creatorAutoApprove: z.boolean().optional(),
    homepageSections: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    featuredCourseIds: z.array(cuid).max(24).optional(),
    featuredCreatorIds: z.array(cuid).max(24).optional(),
    paymentProviders: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    defaultPaymentProvider: z.string().trim().max(40).optional(),
    seoDefaultTitleKa: z.string().trim().max(120).optional(),
    seoDefaultDescriptionKa: z.string().trim().max(300).optional(),
  })
  .strict();

export const adminRefundSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
    amount: moneyMajor.optional(),
    revokeAccess: z.boolean().default(true),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

export const adminPayoutSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT", "MARK_PROCESSING", "MARK_PAID", "MARK_FAILED"]),
    providerRef: z.string().trim().max(120).optional(),
    adminNote: z.string().trim().max(1000).optional(),
  })
  .strict();

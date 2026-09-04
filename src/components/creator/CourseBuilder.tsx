"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  Alert, Card, Checkbox, Field, Input, Select, Textarea,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CurriculumEditor, type EditorModule } from "./CurriculumEditor";
import { ListEditor } from "./ListEditor";
import { QuizEditor } from "./QuizEditor";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";
import { cn } from "@/lib/cn";

export interface BuilderCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnailUrl: string;
  categoryId: string;
  subcategoryId: string;
  language: string;
  level: string;
  status: string;
  price: string;
  discountPrice: string;
  currency: string;
  hasCertificate: boolean;
  metaTitle: string;
  metaDescription: string;
  learningOutcomes: string[];
  requirements: string[];
  targetAudience: string[];
  faqs: { question: string; answer: string }[];
  reviewerNote: string | null;
}

export interface BuilderCategory {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

type Tab = "basics" | "curriculum" | "pricing" | "publish";

interface ReadinessIssue {
  field: string;
  message: string;
}

/**
 * The course builder.
 *
 * Saving is explicit rather than autosaving on every keystroke: a creator
 * editing prices and a published description needs to know exactly when a
 * change goes live. Curriculum edits (which are structural, not textual) do
 * save immediately, because that is what direct manipulation implies.
 */
export function CourseBuilder({
  course,
  modules,
  categories,
  locale,
  t,
  approvalRequired,
}: {
  course: BuilderCourse;
  modules: EditorModule[];
  categories: BuilderCategory[];
  locale: Locale;
  t: Dictionary;
  approvalRequired: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("basics");
  const [values, setValues] = useState(course);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [readiness, setReadiness] = useState<ReadinessIssue[] | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);

  const set = <K extends keyof BuilderCourse>(key: K, value: BuilderCourse[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  // The curriculum editor asks for the quiz modal via a DOM event so the two
  // components stay decoupled.
  useEffect(() => {
    const open = (event: Event) => {
      setQuizLessonId((event as CustomEvent<{ lessonId: string }>).detail.lessonId);
    };
    document.addEventListener("open-quiz-editor", open);
    return () => document.removeEventListener("open-quiz-editor", open);
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/courses/${course.id}`, {
        title: values.title,
        subtitle: values.subtitle,
        description: values.description,
        thumbnailUrl: values.thumbnailUrl,
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId,
        language: values.language,
        level: values.level,
        price: values.price === "" ? 0 : values.price,
        discountPrice: values.discountPrice === "" ? null : values.discountPrice,
        learningOutcomes: values.learningOutcomes,
        requirements: values.requirements,
        targetAudience: values.targetAudience,
        hasCertificate: values.hasCertificate,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        faqs: values.faqs,
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function checkReadiness() {
    try {
      const result = await api.get<{ ready: boolean; issues: ReadinessIssue[] }>(
        `/api/courses/${course.id}/status`,
      );
      setReadiness(result.issues);
      return result.ready;
    } catch (err) {
      setError(err);
      return false;
    }
  }

  async function transition(to: string) {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/courses/${course.id}/status`, { to });
      setValues((v) => ({ ...v, status: to }));
      setReadiness([]);
      router.refresh();
    } catch (err) {
      setError(err);
      // A failed submit is almost always a readiness problem — show the list.
      await checkReadiness();
    } finally {
      setSaving(false);
    }
  }

  async function uploadThumbnail(file: File) {
    setUploadingThumb(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "thumbnail");
      form.set("courseId", course.id);
      const result = await api.upload<{ url: string | null; key: string }>("/api/uploads", form);
      set("thumbnailUrl", result.url ?? `/api/files/${result.key}`);
    } catch (err) {
      setError(err);
    } finally {
      setUploadingThumb(false);
    }
  }

  const isDraft = ["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(values.status);
  const canSubmit = isDraft;
  const canPublish = values.status === "APPROVED" || (!approvalRequired && isDraft);
  const canUnpublish = values.status === "PUBLISHED";

  const tabs: { key: Tab; label: string }[] = [
    { key: "basics", label: t.creator.basics },
    { key: "curriculum", label: t.creator.curriculum },
    { key: "pricing", label: t.creator.pricing },
    { key: "publish", label: t.creator.publish },
  ];

  return (
    <div>
      {/* Sticky action bar */}
      <div className="sticky top-16 z-30 -mx-4 mb-5 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold">{values.title}</h1>
              <StatusBadge status={values.status} t={t} />
            </div>
            <p className="mt-0.5 truncate text-[12px] text-ink-subtle">/courses/{values.slug}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {values.status === "PUBLISHED" && (
              <ButtonLink href={`/courses/${values.slug}`} size="sm" variant="ghost">
                <Icon name="external" size={14} />
                {t.common.open}
              </ButtonLink>
            )}
            <Button size="sm" loading={saving} onClick={save}>
              {saved ? t.common.saved : t.creator.saveDraft}
            </Button>
          </div>
        </div>
      </div>

      {error != null && (
        <Alert tone="danger" className="mb-4">
          {errorMessage(error)}
        </Alert>
      )}
      {saved && (
        <Alert tone="success" className="mb-4">
          {t.common.saved}
        </Alert>
      )}
      {values.reviewerNote && (values.status === "CHANGES_REQUESTED" || values.status === "REJECTED") && (
        <Alert tone="warn" className="mb-4" title={t.admin.reason}>
          {values.reviewerNote}
        </Alert>
      )}

      {/* Tabs */}
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors",
              tab === item.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Basics ────────────────────────────────────────────────────────── */}
      {tab === "basics" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-5">
            <Card className="p-5">
              <h2 className="mb-4 text-base">{t.creator.basics}</h2>

              <Field label={t.creator.lessonTitle} error={fieldError(error, "title")} required>
                <Input
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={140}
                />
              </Field>

              <Field
                className="mt-4"
                label={locale === "en" ? "Subtitle" : "ქვესათაური"}
                hint={
                  locale === "en"
                    ? "One line that sells the course. Shown in search results."
                    : "ერთი წინადადება, რომელიც ყიდის კურსს. ჩანს ძიების შედეგებში."
                }
                error={fieldError(error, "subtitle")}
              >
                <Input
                  value={values.subtitle}
                  onChange={(e) => set("subtitle", e.target.value)}
                  maxLength={200}
                />
              </Field>

              <Field
                className="mt-4"
                label={t.courses.description}
                hint={
                  locale === "en" ? "At least 100 characters" : "მინიმუმ 100 სიმბოლო"
                }
                error={fieldError(error, "description")}
              >
                <Textarea
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={8}
                  maxLength={20_000}
                />
              </Field>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t.courses.filterCategory} error={fieldError(error, "categoryId")}>
                  <Select
                    value={values.categoryId}
                    onChange={(e) => set("categoryId", e.target.value)}
                  >
                    <option value="">—</option>
                    {categories.map((category) => (
                      <optgroup key={category.id} label={category.name}>
                        <option value={category.id}>{category.name}</option>
                        {category.children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {"— "}
                            {child.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </Field>

                <Field label={t.courses.filterLevel}>
                  <Select value={values.level} onChange={(e) => set("level", e.target.value)}>
                    <option value="BEGINNER">{t.courses.levelBEGINNER}</option>
                    <option value="INTERMEDIATE">{t.courses.levelINTERMEDIATE}</option>
                    <option value="ADVANCED">{t.courses.levelADVANCED}</option>
                    <option value="ALL_LEVELS">{t.courses.levelALL_LEVELS}</option>
                  </Select>
                </Field>

                <Field label={t.courses.filterLanguage}>
                  <Select value={values.language} onChange={(e) => set("language", e.target.value)}>
                    <option value="ka">ქართული</option>
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                  </Select>
                </Field>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 text-base">{t.courses.whatYouLearn}</h2>
              <p className="mb-4 text-[12px] text-ink-subtle">
                {locale === "en" ? "At least 3 outcomes" : "მინიმუმ 3 შედეგი"}
              </p>
              <ListEditor
                items={values.learningOutcomes}
                onChange={(items) => set("learningOutcomes", items)}
                placeholder={
                  locale === "en"
                    ? "e.g. Build and launch your first ad campaign"
                    : "მაგ. გაუშვებ პირველ სარეკლამო კამპანიას"
                }
                addLabel={t.common.add}
                maxItems={30}
              />
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-base">{t.courses.requirements}</h2>
              <ListEditor
                items={values.requirements}
                onChange={(items) => set("requirements", items)}
                placeholder={
                  locale === "en" ? "e.g. A computer with internet" : "მაგ. კომპიუტერი ინტერნეტით"
                }
                addLabel={t.common.add}
                maxItems={30}
              />
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-base">{t.courses.targetAudience}</h2>
              <ListEditor
                items={values.targetAudience}
                onChange={(items) => set("targetAudience", items)}
                placeholder={
                  locale === "en" ? "e.g. Small business owners" : "მაგ. მცირე ბიზნესის მფლობელები"
                }
                addLabel={t.common.add}
                maxItems={30}
              />
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-base">{t.courses.faqTitle}</h2>
              <FaqEditor
                faqs={values.faqs}
                onChange={(faqs) => set("faqs", faqs)}
                labels={{
                  question: locale === "en" ? "Question" : "შეკითხვა",
                  answer: locale === "en" ? "Answer" : "პასუხი",
                  add: t.common.add,
                  remove: t.common.remove,
                }}
              />
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="mb-3 text-base">
                {locale === "en" ? "Course image" : "კურსის ფოტო"}
              </h2>
              <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-surface-sunken">
                {values.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the
                  // thumbnail can live on any configured storage host.
                  <img
                    src={values.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-subtle">
                    <Icon name="camera" size={26} />
                  </div>
                )}
              </div>
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-strong px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted">
                <Icon name="upload" size={15} />
                {uploadingThumb ? t.common.saving : t.common.upload}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadThumbnail(file);
                  }}
                />
              </label>
              <p className="mt-2 text-[11px] text-ink-subtle">
                {locale === "en" ? "16:9 · at least 1280×720 · max 8MB" : "16:9 · მინიმუმ 1280×720 · მაქს. 8MB"}
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-base">SEO</h2>
              <Field
                label={locale === "en" ? "Meta title" : "Meta სათაური"}
                hint={`${values.metaTitle.length}/70`}
              >
                <Input
                  value={values.metaTitle}
                  onChange={(e) => set("metaTitle", e.target.value)}
                  maxLength={70}
                  placeholder={values.title}
                />
              </Field>
              <Field
                className="mt-4"
                label={locale === "en" ? "Meta description" : "Meta აღწერა"}
                hint={`${values.metaDescription.length}/180`}
              >
                <Textarea
                  value={values.metaDescription}
                  onChange={(e) => set("metaDescription", e.target.value)}
                  maxLength={180}
                  rows={3}
                  placeholder={values.subtitle}
                />
              </Field>
            </Card>
          </div>
        </div>
      )}

      {/* ── Curriculum ────────────────────────────────────────────────────── */}
      {tab === "curriculum" && (
        <CurriculumEditor
          courseId={course.id}
          initialModules={modules}
          locale={locale}
          labels={{
            modules: t.common.modules,
            lessons: t.common.lessons,
            addModule: t.creator.addModule,
            addLesson: t.creator.addLesson,
            moduleTitle: t.creator.moduleTitle,
            lessonTitle: t.creator.lessonTitle,
            lessonType: t.creator.lessonType,
            lessonDescription: t.courses.description,
            textContent: locale === "en" ? "Lesson text" : "გაკვეთილის ტექსტი",
            newLesson: locale === "en" ? "New lesson" : "ახალი გაკვეთილი",
            noLessons: locale === "en" ? "No lessons yet" : "გაკვეთილები ჯერ არ არის",
            noModules: locale === "en" ? "No modules yet" : "მოდულები ჯერ არ არის",
            noContent: locale === "en" ? "No content" : "შიგთავსი არ არის",
            freePreview: t.creator.freePreview,
            visible: locale === "en" ? "Visible" : "ხილული",
            hidden: locale === "en" ? "Hidden" : "დამალული",
            duration: t.courses.duration,
            durationHint: locale === "en" ? "minutes" : "წუთი",
            videoFile: locale === "en" ? "Video file" : "ვიდეო ფაილი",
            pdfFile: "PDF",
            captions: t.learn.captions,
            uploadFile: t.common.upload,
            replaceFile: locale === "en" ? "Replace" : "შეცვლა",
            uploaded: locale === "en" ? "Uploaded" : "ატვირთულია",
            editQuiz: locale === "en" ? "Edit quiz questions" : "ქვიზის რედაქტირება",
            edit: t.common.edit,
            delete: t.common.delete,
            done: t.common.close,
            moveUp: locale === "en" ? "Move up" : "მაღლა",
            moveDown: locale === "en" ? "Move down" : "დაბლა",
            confirmDeleteModule:
              locale === "en"
                ? "Delete this module and all its lessons?"
                : "წავშალოთ მოდული და მისი ყველა გაკვეთილი?",
            confirmDeleteLesson:
              locale === "en" ? "Delete this lesson?" : "წავშალოთ ეს გაკვეთილი?",
          }}
        />
      )}

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      {tab === "pricing" && (
        <Card className="max-w-xl p-5">
          <h2 className="mb-4 text-base">{t.creator.pricing}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={`${t.courses.filterPrice} (${values.currency})`}
              hint={locale === "en" ? "0 = free course" : "0 = უფასო კურსი"}
              error={fieldError(error, "price")}
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                value={values.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </Field>

            <Field
              label={locale === "en" ? "Discounted price" : "ფასდაკლებული ფასი"}
              hint={locale === "en" ? "Leave empty for no discount" : "ცარიელი = ფასდაკლების გარეშე"}
              error={fieldError(error, "discountPrice")}
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                value={values.discountPrice}
                onChange={(e) => set("discountPrice", e.target.value)}
              />
            </Field>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-muted">
            <Checkbox
              checked={values.hasCertificate}
              onChange={(e) => set("hasCertificate", e.target.checked)}
            />
            {t.courses.includesCertificate}
          </label>

          <Alert tone="brand" className="mt-5">
            {locale === "en"
              ? "The platform commission is deducted per sale; your dashboard shows the exact split for every order."
              : "პლატფორმის საკომისიო იჭრება თითოეული გაყიდვისას. დეშბორდზე ხედავთ ზუსტ განაწილებას ყოველ შეკვეთაზე."}
          </Alert>
        </Card>
      )}

      {/* ── Publish ───────────────────────────────────────────────────────── */}
      {tab === "publish" && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base">{t.common.status}</h2>
                <p className="mt-1 text-[13px] text-ink-muted">
                  {approvalRequired ? t.creator.publishHint : ""}
                </p>
              </div>
              <StatusBadge status={values.status} t={t} />
            </div>

            {/* Workflow, spelled out so the creator knows where they are. */}
            <ol className="mt-5 flex flex-wrap items-center gap-2 text-[12px]">
              {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED"].map((step, i) => {
                const order = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED"];
                const currentIndex = order.indexOf(values.status);
                const done = currentIndex >= 0 && i <= currentIndex;
                return (
                  <li key={step} className="flex items-center gap-2">
                    {i > 0 && <Icon name="chevronRight" size={12} className="text-ink-subtle" />}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 font-medium",
                        done ? "bg-brand-100 text-brand-800" : "bg-surface-sunken text-ink-subtle",
                      )}
                    >
                      {t.creator[`status${step}` as keyof typeof t.creator] as string}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {canSubmit && (
                <Button loading={saving} onClick={() => transition("SUBMITTED")}>
                  <Icon name="send" size={16} />
                  {t.creator.submitForReview}
                </Button>
              )}
              {canPublish && (
                <Button loading={saving} onClick={() => transition("PUBLISHED")}>
                  <Icon name="globe" size={16} />
                  {t.creator.publish}
                </Button>
              )}
              {canUnpublish && (
                <Button variant="outline" loading={saving} onClick={() => transition("UNPUBLISHED")}>
                  {t.creator.unpublish}
                </Button>
              )}
              {values.status === "UNPUBLISHED" && (
                <Button loading={saving} onClick={() => transition("PUBLISHED")}>
                  {t.creator.publish}
                </Button>
              )}
              <Button variant="ghost" onClick={checkReadiness}>
                <Icon name="check" size={16} />
                {locale === "en" ? "Check readiness" : "მზაობის შემოწმება"}
              </Button>
            </div>
          </Card>

          {readiness !== null && (
            <Card className="p-5">
              <h2 className="mb-3 text-base">
                {locale === "en" ? "Readiness checklist" : "მზაობის ჩეკლისტი"}
              </h2>
              {readiness.length === 0 ? (
                <Alert tone="success">
                  {locale === "en"
                    ? "Everything looks good — this course is ready to submit."
                    : "ყველაფერი მზადაა — კურსი შეგიძლიათ გააგზავნოთ განხილვაზე."}
                </Alert>
              ) : (
                <ul className="space-y-2">
                  {readiness.map((issue) => (
                    <li
                      key={`${issue.field}-${issue.message}`}
                      className="flex items-start gap-2.5 text-[13px] text-ink-muted"
                    >
                      <Icon
                        name="alert"
                        size={15}
                        className="mt-0.5 shrink-0 text-warn-700"
                      />
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}

      {quizLessonId && (
        <QuizEditor
          lessonId={quizLessonId}
          locale={locale}
          t={t}
          onClose={() => setQuizLessonId(null)}
        />
      )}
    </div>
  );
}

function FaqEditor({
  faqs,
  onChange,
  labels,
}: {
  faqs: { question: string; answer: string }[];
  onChange: (faqs: { question: string; answer: string }[]) => void;
  labels: Record<string, string>;
}) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="rounded-xl border border-line p-3">
          <Input
            value={faq.question}
            placeholder={labels.question}
            onChange={(e) => {
              const next = [...faqs];
              next[index] = { ...faq, question: e.target.value };
              onChange(next);
            }}
            maxLength={300}
          />
          <Textarea
            className="mt-2"
            value={faq.answer}
            placeholder={labels.answer}
            rows={2}
            maxLength={2000}
            onChange={(e) => {
              const next = [...faqs];
              next[index] = { ...faq, answer: e.target.value };
              onChange(next);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(faqs.filter((_, i) => i !== index))}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-danger-700 hover:underline"
          >
            <Icon name="trash" size={13} />
            {labels.remove}
          </button>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...faqs, { question: "", answer: "" }])}
      >
        <Icon name="plus" size={14} />
        {labels.add}
      </Button>
    </div>
  );
}

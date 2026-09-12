"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, fieldError } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { fill } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface Announcement {
  id: string;
  subject: string;
  body: string;
  sendEmail: boolean;
  recipientCount: number;
  createdAt: string;
  course: { id: string; title: string } | null;
}

/**
 * Writing to your students, and the record of what you already sent.
 *
 * The history is not decoration. A creator needs to see what they said before
 * saying something similar, and the recipient count is the only honest answer
 * to "did that actually go out?" — a send that reached nobody looks identical
 * to a successful one otherwise.
 */
export function AnnouncementComposer({
  courses,
  locale,
  t,
}: {
  courses: { id: string; title: string; studentCount: number }[];
  locale: Locale;
  t: Dictionary;
}) {
  const toast = useToast();
  const [sent, setSent] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.get<{ announcements: Announcement[] }>("/api/announcements");
      setSent(result.announcements);
    } catch {
      setSent([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Shown before sending, so nobody discovers the size of their audience
  // by sending to it.
  const audience = courseId
    ? (courses.find((c) => c.id === courseId)?.studentCount ?? 0)
    : courses.reduce((sum, c) => sum + c.studentCount, 0);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ announcement: Announcement }>("/api/announcements", {
        courseId: courseId || undefined,
        subject: subject.trim(),
        body: body.trim(),
        sendEmail,
      });
      setSubject("");
      setBody("");
      setSendEmail(false);
      await load();
      toast.show(
        fill(t.creator.announcementSent, { n: result.announcement.recipientCount }),
        "success",
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-base">{t.creator.announcementNew}</h2>

        {error != null && (
          <Alert tone="danger" className="mb-4">
            {errorMessage(error)}
          </Alert>
        )}

        <Field label={t.creator.announcementAudience} hint={t.creator.announcementAudienceHint}>
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">{t.creator.announcementEveryone}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.studentCount})
              </option>
            ))}
          </Select>
        </Field>

        <Field className="mt-4" label={t.creator.announcementSubject} error={fieldError(error, "subject")}>
          <Input
            value={subject}
            placeholder={t.creator.announcementSubjectPlaceholder}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>

        <Field className="mt-4" label={t.creator.announcementBody} error={fieldError(error, "body")}>
          <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] text-ink-muted">
          <Checkbox
            className="mt-0.5"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
          <span>
            {t.creator.announcementEmail}
            <span className="mt-0.5 block text-[12px] text-ink-subtle">
              {t.creator.announcementEmailHint}
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button loading={busy} disabled={subject.trim().length < 3 || body.trim().length < 10} onClick={send}>
            <Icon name="send" size={16} />
            {t.creator.announcementSend}
          </Button>
          <span className="text-[13px] text-ink-muted">
            {fill(t.creator.announcementReach, { n: audience })}
          </span>
        </div>

        <Alert tone="brand" className="mt-4">
          {fill(t.creator.announcementLimit, { n: 3 })}
        </Alert>
      </Card>

      {sent && sent.length > 0 && (
        <div>
          <h2 className="mb-3 text-base">{t.creator.announcementHistory}</h2>
          <ul className="space-y-2.5">
            {sent.map((item) => (
              <li key={item.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[15px]">{item.subject}</h3>
                    <span className="text-[12px] text-ink-subtle">
                      <TimeAgo date={item.createdAt} locale={locale} />
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-subtle">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="users" size={13} />
                      {fill(t.creator.announcementReached, { n: item.recipientCount })}
                    </span>
                    <span>{item.course ? item.course.title : t.creator.announcementEveryone}</span>
                    {item.sendEmail && (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="send" size={13} />
                        {t.creator.announcementByEmail}
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

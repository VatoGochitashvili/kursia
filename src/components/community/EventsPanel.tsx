"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatDate, relativeTime } from "@/lib/format";
import { fill } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  joinUrl: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  isCancelled: boolean;
  attending: boolean;
  attendeeCount: number;
  course: { slug: string; title: string } | null;
}

interface Membership {
  isMember: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

/** The doors open ten minutes early, as they do for a real room. */
const JOIN_LEAD_MS = 10 * 60_000;

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** Local calendar day, used only to group rows under one heading. */
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * A creator's calendar of live sessions.
 *
 * Times are rendered from the browser's own clock, which is the point: the
 * creator schedules in their zone, the API stores an instant, and a student in
 * Berlin sees their own 19:00. The creator's zone is printed alongside so the
 * conversion is checkable rather than something to trust.
 *
 * Every control here is drawn from the `membership` the endpoint returned, and
 * decides nothing: a tampered client gets a cancel button the server refuses.
 */
export function EventsPanel({
  creatorId,
  courses,
  locale,
  t,
}: {
  creatorId: string;
  courses: { id: string; title: string }[];
  locale: Locale;
  t: Dictionary;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<EventRow | null>(null);

  // Re-rendered on a timer so "starts in 3 minutes" and the join window do not
  // go stale on a tab somebody left open all afternoon.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    joinUrl: "",
    startsAt: "",
    endsAt: "",
    courseId: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (which: "upcoming" | "past") => {
      setError(null);
      try {
        const data = await api.get<{ events: EventRow[]; membership: Membership }>(
          `/api/events?creatorId=${creatorId}${which === "past" ? "&past=1" : ""}`,
        );
        setEvents(data.events);
        setMembership(data.membership);
      } catch (err) {
        setError(errorMessage(err));
        setEvents([]);
      }
    },
    [creatorId],
  );

  useEffect(() => {
    setEvents(null);
    void load(tab);
  }, [load, tab]);

  const canSchedule = Boolean(membership?.isOwner || membership?.isAdmin);

  async function toggleAttend(event: EventRow) {
    setBusyId(event.id);
    try {
      const result = await api[event.attending ? "delete" : "post"]<{
        attending: boolean;
        attendeeCount: number;
      }>(`/api/events/${event.id}`);
      setEvents((rows) =>
        (rows ?? []).map((row) =>
          row.id === event.id
            ? { ...row, attending: result.attending, attendeeCount: result.attendeeCount }
            : row,
        ),
      );
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setBusyId(null);
    }
  }

  async function schedule() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/events", {
        creatorId,
        title: draft.title,
        description: draft.description || undefined,
        joinUrl: draft.joinUrl || undefined,
        courseId: draft.courseId || undefined,
        // `datetime-local` gives a wall-clock string with no zone; the Date
        // constructor reads it in the creator's own zone, which is what they
        // meant, and toISOString pins it to an instant.
        startsAt: new Date(draft.startsAt).toISOString(),
        endsAt: new Date(draft.endsAt).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tbilisi",
      });
      toast.show(t.events.scheduled, "success");
      setFormOpen(false);
      setDraft({ title: "", description: "", joinUrl: "", startsAt: "", endsAt: "", courseId: "" });
      setTab("upcoming");
      await load("upcoming");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmCancel() {
    if (!cancelling) return;
    setSaving(true);
    try {
      await api.patch(`/api/events/${cancelling.id}`, { isCancelled: true });
      toast.show(t.events.cancelled_toast, "success");
      setEvents((rows) =>
        (rows ?? []).map((row) => (row.id === cancelling.id ? { ...row, isCancelled: true } : row)),
      );
      setCancelling(null);
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setSaving(false);
    }
  }

  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: EventRow[] }[] = [];
    for (const row of events ?? []) {
      const key = dayKey(row.startsAt);
      const last = out[out.length - 1];
      if (last?.key === key) last.rows.push(row);
      else out.push({ key, label: formatDate(new Date(row.startsAt), locale), rows: [row] });
    }
    return out;
  }, [events, locale]);

  const startedDraft = draft.title.trim().length >= 3 && draft.startsAt && draft.endsAt;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-surface-sunken p-1">
          {(["upcoming", "past"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "h-9 rounded-lg px-4 text-[13px] font-semibold transition-colors",
                tab === key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {key === "upcoming" ? t.events.tabUpcoming : t.events.tabPast}
            </button>
          ))}
        </div>

        {canSchedule && !formOpen && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Icon name="plus" size={16} />
            {t.events.schedule}
          </Button>
        )}
      </div>

      {error && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {canSchedule && formOpen && (
        <Card className="mb-5 animate-fade-up p-5">
          <h2 className="mb-4 text-base">{t.events.formTitle}</h2>

          <div className="grid gap-4">
            <Field label={t.events.fieldTitle}>
              <Input
                value={draft.title}
                placeholder={t.events.fieldTitlePlaceholder}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>

            <Field label={t.events.fieldDescription}>
              <Textarea
                rows={3}
                value={draft.description}
                placeholder={t.events.fieldDescriptionPlaceholder}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.events.fieldStarts}>
                <Input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                />
              </Field>
              <Field label={t.events.fieldEnds}>
                <Input
                  type="datetime-local"
                  value={draft.endsAt}
                  min={draft.startsAt || undefined}
                  onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                />
              </Field>
            </div>

            <Field label={t.events.fieldJoinUrl} hint={t.events.fieldJoinUrlHint}>
              <Input
                type="url"
                inputMode="url"
                placeholder="https://"
                value={draft.joinUrl}
                onChange={(e) => setDraft({ ...draft, joinUrl: e.target.value })}
              />
            </Field>

            {courses.length > 0 && (
              <Field label={t.events.fieldCourse} hint={t.events.fieldCourseHint}>
                <Select
                  value={draft.courseId}
                  onChange={(e) => setDraft({ ...draft, courseId: e.target.value })}
                >
                  <option value="">{t.events.fieldCourseAll}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button loading={saving} disabled={!startedDraft} onClick={schedule}>
              {t.events.schedule}
            </Button>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </Card>
      )}

      {events === null && (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {events !== null && events.length === 0 && (
        <Card className="p-10 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="calendar" size={24} />
          </span>
          <h2 className="mt-5 text-lg">
            {tab === "past" ? t.events.emptyPast : t.events.emptyTitle}
          </h2>
          {tab === "upcoming" && (
            <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">
              {canSchedule ? t.events.emptyBodyOwner : t.events.emptyBody}
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-7">
        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {group.label}
            </h2>

            <div className="grid gap-3">
              {group.rows.map((event) => {
                const starts = new Date(event.startsAt).getTime();
                const ends = new Date(event.endsAt).getTime();
                const live = !event.isCancelled && now >= starts && now <= ends;
                const joinable = !event.isCancelled && now >= starts - JOIN_LEAD_MS && now <= ends;
                const over = now > ends;

                return (
                  <Card
                    key={event.id}
                    className={cn(
                      "p-4 transition-colors sm:p-5",
                      live && "border-brand-300 bg-brand-50/40",
                      event.isCancelled && "opacity-70",
                    )}
                  >
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          "flex w-[74px] shrink-0 flex-col items-center justify-center self-start rounded-xl border px-2 py-2.5",
                          live
                            ? "border-brand-300 bg-surface text-brand-700"
                            : "border-line bg-surface-sunken text-ink",
                        )}
                      >
                        <span className="text-[15px] font-bold tabular-nums">
                          {hhmm(event.startsAt)}
                        </span>
                        <span className="mt-0.5 text-[11px] tabular-nums text-ink-subtle">
                          {hhmm(event.endsAt)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={cn(
                              "text-[15px] font-semibold leading-snug",
                              event.isCancelled && "line-through decoration-danger-500/60",
                            )}
                          >
                            {event.title}
                          </h3>
                          {live && <Badge tone="brand">{t.events.liveNow}</Badge>}
                          {event.isCancelled && <Badge tone="danger">{t.events.cancelled}</Badge>}
                        </div>

                        {event.course && (
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-subtle">
                            <Icon name="book" size={13} />
                            {event.course.title}
                          </p>
                        )}

                        {event.description && (
                          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">
                            {event.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-subtle">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="users" size={13} />
                            {fill(t.events.attendees, { count: String(event.attendeeCount) })}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="globe" size={13} />
                            {event.timezone}
                          </span>
                          {!over && !event.isCancelled && !live && (
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="clock" size={13} />
                              {fill(t.events.startsIn, {
                                time: relativeTime(new Date(event.startsAt), locale),
                              })}
                            </span>
                          )}
                        </div>

                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                          {!over && !event.isCancelled && (
                            <Button
                              size="sm"
                              variant={event.attending ? "outline" : "primary"}
                              loading={busyId === event.id}
                              onClick={() => toggleAttend(event)}
                            >
                              {event.attending ? (
                                <>
                                  <Icon name="check" size={15} />
                                  {t.events.attending}
                                </>
                              ) : (
                                t.events.attend
                              )}
                            </Button>
                          )}

                          {event.joinUrl && joinable && (
                            <a
                              href={event.joinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-success-700"
                            >
                              <Icon name="video" size={15} />
                              {t.events.join}
                            </a>
                          )}

                          {canSchedule && !event.isCancelled && !over && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger-700 hover:bg-danger-50"
                              onClick={() => setCancelling(event)}
                            >
                              {t.events.cancelEvent}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={t.events.cancelEvent}
        body={t.events.cancelConfirm}
        confirmLabel={t.events.cancelEvent}
        cancelLabel={t.common.cancel}
        pending={saving}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}

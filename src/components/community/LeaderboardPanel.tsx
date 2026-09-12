"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Alert, Avatar, Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";
import { fill } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface Row {
  userId: string;
  points: number;
  rank: number;
  name: string;
  avatarUrl: string | null;
  isCreator: boolean;
  level: number;
}

interface Standing {
  points: number;
  level: number;
  nextAt: number | null;
  progress: number;
}

const WINDOWS = ["7d", "30d", "all"] as const;
type Window = (typeof WINDOWS)[number];

/**
 * The community leaderboard.
 *
 * Three windows, because an all-time board is a wall: whoever joined first
 * stays on top for ever and nobody new can see a way in. The weekly board is
 * the one that is actually winnable, so it leads.
 *
 * The level badge is always lifetime, even on the weekly board — a quiet week
 * does not demote anybody.
 */
export function LeaderboardPanel({
  creatorId,
  viewerId,
  t,
}: {
  creatorId: string;
  viewerId: string | null;
  locale: Locale;
  t: Dictionary;
}) {
  const [window, setWindow] = useState<Window>("7d");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [viewerRow, setViewerRow] = useState<Row | null>(null);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (which: Window) => {
      setError(null);
      try {
        const data = await api.get<{
          rows: Row[];
          viewer: Row | null;
          standing: Standing | null;
        }>(`/api/leaderboard?creatorId=${creatorId}&window=${which}`);
        setRows(data.rows);
        setViewerRow(data.viewer);
        setStanding(data.standing);
      } catch (err) {
        setError(errorMessage(err));
        setRows([]);
      }
    },
    [creatorId],
  );

  useEffect(() => {
    setRows(null);
    void load(window);
  }, [load, window]);

  // Shown separately only when the top list does not already contain it.
  const showViewerRow = viewerRow && !(rows ?? []).some((r) => r.userId === viewerRow.userId);

  return (
    <div>
      {standing && (
        <Card className="mb-5 p-5">
          <div className="flex items-center gap-4">
            <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <span className="text-[19px] font-bold tabular-nums">{standing.level}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                {t.leaderboard.yourLevel}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold">
                {fill(t.leaderboard.points, { count: formatNumber(standing.points) })}
              </p>
              <div className="mt-2.5">
                <ProgressBar value={standing.progress} />
                <p className="mt-1.5 text-[12px] text-ink-muted">
                  {standing.nextAt === null
                    ? t.leaderboard.maxLevel
                    : fill(t.leaderboard.toNextLevel, {
                        count: formatNumber(standing.nextAt - standing.points),
                      })}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-5 inline-flex rounded-xl bg-surface-sunken p-1">
        {WINDOWS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setWindow(key)}
            className={cn(
              "h-9 rounded-lg px-4 text-[13px] font-semibold transition-colors",
              window === key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {key === "7d"
              ? t.leaderboard.window7d
              : key === "30d"
                ? t.leaderboard.window30d
                : t.leaderboard.windowAll}
          </button>
        ))}
      </div>

      {error && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {rows === null && (
        <div className="grid gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {rows !== null && rows.length === 0 && !error && (
        <Card className="p-10 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="award" size={24} />
          </span>
          <h2 className="mt-5 text-lg">{t.leaderboard.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">
            {t.leaderboard.emptyBody}
          </p>
        </Card>
      )}

      {rows !== null && rows.length > 0 && (
        <Card className="overflow-hidden">
          <ul>
            {rows.map((row) => (
              <LeaderRow key={row.userId} row={row} isViewer={row.userId === viewerId} t={t} />
            ))}
          </ul>

          {showViewerRow && (
            <>
              {/* A gap, not a border: the ranks between are real, just not shown. */}
              <div className="flex h-6 items-center justify-center text-ink-subtle">
                <span className="text-[15px] leading-none">···</span>
              </div>
              <ul className="border-t border-line">
                <LeaderRow row={viewerRow} isViewer t={t} />
              </ul>
            </>
          )}
        </Card>
      )}

      <Card className="mt-5 p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
          {t.leaderboard.howTitle}
        </h2>
        <ul className="mt-3 grid gap-1.5 text-[13px] text-ink-muted">
          {[
            t.leaderboard.howPost,
            t.leaderboard.howReply,
            t.leaderboard.howLike,
            t.leaderboard.howLesson,
            t.leaderboard.howEvent,
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Icon name="check" size={14} className="mt-0.5 shrink-0 text-brand-600" />
              {line}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** Medal colours for the first three, plain numbers after that. */
const MEDALS: Record<number, string> = {
  1: "bg-[#f5c451] text-[#4a3708]",
  2: "bg-[#d3d8df] text-[#3c444e]",
  3: "bg-[#dba372] text-[#4a2f16]",
};

function LeaderRow({ row, isViewer, t }: { row: Row; isViewer: boolean; t: Dictionary }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0",
        isViewer && "bg-brand-50/50",
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums",
          MEDALS[row.rank] ?? "bg-surface-sunken text-ink-muted",
        )}
      >
        {row.rank}
      </span>

      <Avatar src={row.avatarUrl} name={row.name} size={36} />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 truncate text-[14px] font-semibold">
          {row.name}
          {isViewer && <Badge tone="brand">{t.leaderboard.you}</Badge>}
          {row.isCreator && <Badge>{t.leaderboard.creatorBadge}</Badge>}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-subtle">
          {fill(t.leaderboard.level, { n: String(row.level) })}
        </p>
      </div>

      <span className="shrink-0 text-[14px] font-bold tabular-nums">
        {formatNumber(row.points)}
      </span>
    </li>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  api,
  type WorkspaceEvent,
  type WorkspaceEventRange,
  type WorkspaceEventType,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName } from "@/lib/labels";
import { seCreateHref } from "@/lib/se-workspace-nav";
import { Icons } from "@/components/icons";
import { Button, ButtonLink, EmptyState, TextInput } from "@/components/ui";

const TYPE_FILTERS: { value: WorkspaceEventType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "MONITORING", label: "Monitoring" },
  { value: "COACHING", label: "Coaching" },
  { value: "DAILY_LOG", label: "Daily Log" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "ACTION", label: "Actions" },
  { value: "REVIEW", label: "Reviews" },
  { value: "SUPPORT", label: "Support" },
];

const RANGE_OPTIONS: { value: WorkspaceEventRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All" },
];

const NOTE_PREVIEW_CHARS = 220;

function typeLabel(type: WorkspaceEventType) {
  return (
    TYPE_FILTERS.find((t) => t.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

function TypeIcon({ type }: { type: WorkspaceEventType }) {
  const map = {
    MONITORING: Icons.monitoring,
    COACHING: Icons.reviews,
    DAILY_LOG: Icons.reviews,
    FEEDBACK: Icons.feedback,
    REVIEW: Icons.reviews,
    ACTION: Icons.tasks,
    SUPPORT: Icons.users,
    INTERVENTION: Icons.referral,
    SWOT: Icons.swot,
    GENERAL: Icons.clock,
  } as const;
  const Icon = map[type] ?? Icons.clock;
  return <Icon size={14} />;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayHeading(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupEvents(events: WorkspaceEvent[]) {
  const map = new Map<string, { label: string; items: WorkspaceEvent[] }>();
  for (const event of events) {
    const key = dayKey(event.occurredAt);
    const existing = map.get(key);
    if (existing) existing.items.push(event);
    else {
      map.set(key, {
        label: formatDayHeading(event.occurredAt),
        items: [event],
      });
    }
  }
  return [...map.values()];
}

function EventCard({ event }: { event: WorkspaceEvent }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const notes = event.notes?.trim() ?? "";
  const notesLong = notes.length > NOTE_PREVIEW_CHARS;
  const shownNotes =
    notesLong && !notesOpen
      ? `${notes.slice(0, NOTE_PREVIEW_CHARS).trimEnd()}…`
      : notes;

  return (
    <article className="tl-card">
      <div className="tl-card-top">
        <div className="tl-card-who">
          <span className="tl-card-icon" aria-hidden>
            <TypeIcon type={event.type} />
          </span>
          <div className="min-w-0">
            <p className="tl-card-type">{typeLabel(event.type)}</p>
            <p className="tl-card-author">{personName(event.createdBy)}</p>
          </div>
        </div>
        <time dateTime={event.occurredAt} className="tl-card-time">
          {formatTime(event.occurredAt)}
        </time>
      </div>

      <h3 className="tl-card-title">{event.title}</h3>

      {shownNotes ? (
        <div className="tl-card-notes">
          <p>{shownNotes}</p>
          {notesLong ? (
            <button
              type="button"
              className="tl-inline-more"
              onClick={() => setNotesOpen((v) => !v)}
            >
              {notesOpen ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {event.nextAction ? (
        <div className="tl-card-next">
          <p className="tl-card-next-label">Next action</p>
          <p className="tl-card-next-text">{event.nextAction}</p>
        </div>
      ) : null}

      {event.href ? (
        <div className="tl-card-link">
          <Link href={event.href}>Open record →</Link>
        </div>
      ) : null}
    </article>
  );
}

type Props = {
  profileId: string;
  profileName: string;
  canCreate: boolean;
  compact?: boolean;
  /** When true, hide page chrome (used inside Daily Logs). */
  embedded?: boolean;
  defaultRange?: WorkspaceEventRange;
};

export function SeActivityTimeline({
  profileId,
  profileName,
  canCreate,
  compact = false,
  embedded = false,
  defaultRange = "week",
}: Props) {
  const { token } = useAuth();
  const initialVisible = compact ? 5 : 8;
  const pageSize = compact ? 12 : 40;
  const step = compact ? 5 : 8;

  const [events, setEvents] = useState<WorkspaceEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<WorkspaceEventType | "ALL">("ALL");
  const [range, setRange] = useState<WorkspaceEventRange>(defaultRange);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(initialVisible);
  const dailyLogHref = seCreateHref(profileId, "daily-log");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getWorkspaceEvents(token, {
        profileId,
        type: type === "ALL" ? undefined : type,
        range,
        search: search.trim() || undefined,
        page: 1,
        pageSize,
      });
      setEvents(res.data.events);
      setTotal(res.data.total);
      setPage(1);
      setVisibleCount(initialVisible);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, profileId, type, range, search, pageSize, initialVisible]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleEvents = useMemo(
    () => events.slice(0, visibleCount),
    [events, visibleCount],
  );
  const groups = useMemo(() => groupEvents(visibleEvents), [visibleEvents]);

  const remainingLoaded = Math.max(0, events.length - visibleCount);
  const remainingRemote = Math.max(0, total - events.length);
  const remaining = remainingLoaded + remainingRemote;
  const canShowMore = remaining > 0;
  const canShowLess = visibleCount > initialVisible;

  async function onViewMore() {
    if (remainingLoaded > 0) {
      setVisibleCount((c) => Math.min(c + step, events.length));
      return;
    }
    if (!token || remainingRemote <= 0) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.getWorkspaceEvents(token, {
        profileId,
        type: type === "ALL" ? undefined : type,
        range,
        search: search.trim() || undefined,
        page: nextPage,
        pageSize,
      });
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const added = res.data.events.filter((e) => !seen.has(e.id));
        return [...prev, ...added];
      });
      setTotal(res.data.total);
      setPage(nextPage);
      setVisibleCount((c) => c + step);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  function onShowLess() {
    setVisibleCount(initialVisible);
  }

  return (
    <div className="tl-page">
      {!embedded ? (
        <div className="tl-header">
          <div>
            <h2 className="tl-title">Activity timeline</h2>
            <p className="tl-subtitle">
              What happened with {profileName} — chronological event history.
            </p>
          </div>
          {canCreate ? (
            <ButtonLink href={dailyLogHref} variant="primary" size="sm">
              <Plus size={14} aria-hidden />
              Daily Log
            </ButtonLink>
          ) : null}
        </div>
      ) : canCreate ? (
        <div className="flex justify-end">
          <ButtonLink href={dailyLogHref} variant="primary" size="sm">
            <Plus size={14} aria-hidden />
            Daily Log
          </ButtonLink>
        </div>
      ) : null}

      <div className="tl-toolbar" role="group" aria-label="Time range">
        {RANGE_OPTIONS.map((opt) => {
          const active = range === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => setRange(opt.value)}
              className={`tl-chip${active ? " is-active" : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {!embedded ? (
        <div className="tl-toolbar" role="group" aria-label="Event type">
          {TYPE_FILTERS.map((opt) => {
            const active = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => setType(opt.value)}
                className={`tl-chip is-type${active ? " is-active" : ""}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {!compact ? (
        <TextInput
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, notes, next action…"
        />
      ) : null}

      {!loading && !error && total > 0 ? (
        <p className="tl-count">
          Showing {Math.min(visibleCount, total)} of {total}
        </p>
      ) : null}

      {loading ? (
        <p className="text-meta">Loading timeline…</p>
      ) : error ? (
        <p className="text-sm text-[var(--status-danger)]">{error}</p>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Record what happened with this SE using a Daily Log."
          action={
            canCreate ? (
              <ButtonLink href={dailyLogHref} variant="primary" size="sm">
                Daily Log
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="tl-feed">
            {groups.map((group) => (
              <section key={group.label} className="tl-day">
                <h3 className="tl-day-label">{group.label}</h3>
                <ul className="tl-day-list">
                  {group.items.map((event, index) => (
                    <li key={event.id} className="tl-item">
                      <div className="tl-rail" aria-hidden>
                        <span className="tl-dot" />
                        {index < group.items.length - 1 ? (
                          <span className="tl-line" />
                        ) : null}
                      </div>
                      <EventCard event={event} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {canShowMore || canShowLess ? (
            <div className="tl-more">
              {canShowMore ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void onViewMore()}
                >
                  {loadingMore ? (
                    "Loading…"
                  ) : (
                    <>
                      <ChevronDown size={14} aria-hidden />
                      View more
                      {remaining > 0 ? (
                        <span className="tl-more-count">
                          {remaining} remaining
                        </span>
                      ) : null}
                    </>
                  )}
                </Button>
              ) : null}
              {canShowLess ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onShowLess}
                >
                  <ChevronUp size={14} aria-hidden />
                  Show less
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError, type DailyWorkLog } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  combineLocalDateTime,
  formatDate,
  toLocalDateInput,
  toLocalTimeInput,
} from "@/lib/dates";
import { personName } from "@/lib/labels";
import {
  Button,
  ConfirmDialog,
  Drawer,
  ErrorState,
  LoadingState,
  TextArea,
  TextInput,
} from "@/components/ui";

type DatePreset = "today" | "yesterday" | "week" | "custom";

type Props = {
  profileId?: string | null;
  authorUserId?: string | null;
  mode?: "author" | "review";
  showAuthor?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function formatTimeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return toLocalTimeInput(iso);
  }
}

function dayKey(iso: string) {
  return toLocalDateInput(iso);
}

function dayHeading(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return formatDate(iso);
  }
}

export function DailyWorkLogPanel({
  profileId = null,
  authorUserId = null,
  mode = "review",
  showAuthor = false,
  title = "Daily Work Log",
  emptyTitle = "No work entries yet",
  emptyDescription = "Add your first activity to keep your work journal up to date.",
}: Props) {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();

  const canCreate = hasPermission("DAILY_WORK_LOG_CREATE") && mode === "author";
  const canView = hasPermission("DAILY_WORK_LOG_VIEW");
  const isSelfAuthor = mode === "author";

  const [preset, setPreset] = useState<DatePreset>("today");
  const [customDate, setCustomDate] = useState(toLocalDateInput());
  const [logs, setLogs] = useState<DailyWorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DailyWorkLog | null>(null);
  const [activity, setActivity] = useState("");
  const [notes, setNotes] = useState("");
  const [dateInput, setDateInput] = useState(toLocalDateInput());
  const [timeInput, setTimeInput] = useState(toLocalTimeInput());
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DailyWorkLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = useMemo(() => {
    const now = new Date();
    const localLabel = (d: Date) =>
      d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    if (preset === "today") {
      return {
        dateFrom: startOfLocalDay(now).toISOString(),
        dateTo: endOfLocalDay(now).toISOString(),
        label: localLabel(now),
        shortLabel: "Today",
      };
    }
    if (preset === "yesterday") {
      const y = addDays(now, -1);
      return {
        dateFrom: startOfLocalDay(y).toISOString(),
        dateTo: endOfLocalDay(y).toISOString(),
        label: localLabel(y),
        shortLabel: "Yesterday",
      };
    }
    if (preset === "week") {
      const from = addDays(startOfLocalDay(now), -6);
      return {
        dateFrom: from.toISOString(),
        dateTo: endOfLocalDay(now).toISOString(),
        label: `${formatDate(from.toISOString())} – ${formatDate(now.toISOString())}`,
        shortLabel: "This week",
      };
    }
    const d = new Date(`${customDate}T12:00:00`);
    return {
      dateFrom: startOfLocalDay(d).toISOString(),
      dateTo: endOfLocalDay(d).toISOString(),
      label: localLabel(d),
      shortLabel: "Selected date",
    };
  }, [preset, customDate]);

  const groups = useMemo(() => {
    const map = new Map<string, DailyWorkLog[]>();
    for (const log of logs) {
      const key = dayKey(log.loggedAt);
      const list = map.get(key);
      if (list) list.push(log);
      else map.set(key, [log]);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: dayHeading(items[0]!.loggedAt),
      items,
    }));
  }, [logs]);

  const showDayGroups = preset === "week" || groups.length > 1;

  const load = useCallback(async () => {
    if (!token || !canView) return;
    setLoading(true);
    try {
      const res = await api.getDailyWorkLogs(token, {
        profileId: profileId ?? undefined,
        authorUserId: authorUserId ?? undefined,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        pageSize: 100,
      });
      setLogs(res.data.logs);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load work logs",
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [token, canView, profileId, authorUserId, range.dateFrom, range.dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setActivity("");
    setNotes("");
    setDateInput(toLocalDateInput());
    setTimeInput(toLocalTimeInput());
    setDrawerOpen(true);
  }

  function openEdit(log: DailyWorkLog) {
    setEditing(log);
    setActivity(log.activity);
    setNotes(log.notes ?? "");
    setDateInput(toLocalDateInput(log.loggedAt));
    setTimeInput(toLocalTimeInput(log.loggedAt));
    setDrawerOpen(true);
  }

  async function onSave() {
    if (!token || !activity.trim()) {
      pushToast("Activity is required", "error");
      return;
    }
    setSaving(true);
    try {
      const loggedAt = combineLocalDateTime(dateInput, timeInput);
      if (editing) {
        await api.updateDailyWorkLog(token, editing.id, {
          activity: activity.trim(),
          notes: notes.trim() || null,
          loggedAt,
        });
        pushToast("Work log updated", "success");
      } else {
        await api.createDailyWorkLog(token, {
          activity: activity.trim(),
          notes: notes.trim() || null,
          loggedAt,
        });
        pushToast("Work log saved", "success");
      }
      setDrawerOpen(false);
      await load();
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not save work log",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteDailyWorkLog(token, pendingDelete.id);
      pushToast("Work log deleted", "success");
      setPendingDelete(null);
      await load();
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not delete work log",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!canView) {
    return (
      <ErrorState message="You do not have permission to view daily work logs." />
    );
  }

  return (
    <div className="dwl-page">
      <header className="dwl-header">
        <div className="dwl-header-copy">
          <p className="dwl-eyebrow">
            <NotebookPen size={12} strokeWidth={2.25} aria-hidden />
            Work journal
          </p>
          <h1 className="dwl-title">{title}</h1>
          <p className="dwl-date">
            {range.shortLabel}
            <span className="dwl-date-sep" aria-hidden>
              ·
            </span>
            {range.label}
          </p>
        </div>
        {canCreate && isSelfAuthor ? (
          <Button className="dwl-add-btn" onClick={openCreate}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Add entry
          </Button>
        ) : null}
      </header>

      <div className="dwl-toolbar">
        <div className="dwl-filters" role="tablist" aria-label="Date filter">
          {(
            [
              ["today", "Today", false],
              ["yesterday", "Yesterday", false],
              ["week", "This week", false],
              ["custom", "Pick date", true],
            ] as const
          ).map(([key, label, withIcon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={preset === key}
              className={`dwl-filter${preset === key ? " is-active" : ""}`}
              onClick={() => setPreset(key)}
            >
              {withIcon ? (
                <CalendarDays size={13} strokeWidth={2} aria-hidden />
              ) : null}
              {label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <label className="dwl-date-field">
            <span className="sr-only">Choose date</span>
            <input
              type="date"
              className="dwl-date-input"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </label>
        ) : null}
        {!loading && !error ? (
          <p className="dwl-count" aria-live="polite">
            {logs.length === 0
              ? "0 entries"
              : `${logs.length} entr${logs.length === 1 ? "y" : "ies"}`}
          </p>
        ) : null}
      </div>

      <div className="dwl-content">
        {loading ? (
          <div className="dwl-state">
            <LoadingState label="Loading work logs…" />
          </div>
        ) : error ? (
          <div className="dwl-state">
            <ErrorState message={error} />
          </div>
        ) : logs.length === 0 ? (
          <div className="dwl-empty">
            <p className="dwl-empty-title">
              {canCreate && isSelfAuthor
                ? emptyTitle
                : "No logs for this range"}
            </p>
            <p className="dwl-empty-desc">
              {canCreate && isSelfAuthor
                ? emptyDescription
                : "No daily work has been recorded for the selected dates."}
            </p>
            {canCreate && isSelfAuthor ? (
              <Button className="dwl-empty-cta" onClick={openCreate}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add entry
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="dwl-feed">
            {groups.map((group) => (
              <section key={group.key} className="dwl-group">
                {showDayGroups ? (
                  <h2 className="dwl-day">{group.label}</h2>
                ) : null}
                <ol className="dwl-timeline">
                  {group.items.map((log) => {
                    const own = log.authorUserId === user?.id;
                    return (
                      <li key={log.id} className="dwl-entry">
                        <div className="dwl-rail" aria-hidden>
                          <span className="dwl-dot" />
                        </div>
                        <article className="dwl-card">
                          <header className="dwl-card-head">
                            <time
                              className="dwl-time"
                              dateTime={log.loggedAt}
                            >
                              {formatTimeLabel(log.loggedAt)}
                            </time>
                            {own && canCreate ? (
                              <div className="dwl-actions">
                                <button
                                  type="button"
                                  className="dwl-icon-btn"
                                  title="Edit"
                                  aria-label="Edit entry"
                                  onClick={() => openEdit(log)}
                                >
                                  <Pencil size={14} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  className="dwl-icon-btn is-danger"
                                  title="Delete"
                                  aria-label="Delete entry"
                                  onClick={() => setPendingDelete(log)}
                                >
                                  <Trash2 size={14} strokeWidth={2} />
                                </button>
                              </div>
                            ) : null}
                          </header>
                          <p className="dwl-activity">{log.activity}</p>
                          {log.notes ? (
                            <p className="dwl-notes">{log.notes}</p>
                          ) : null}
                          {showAuthor ? (
                            <p className="dwl-meta">
                              {personName(log.author)}
                            </p>
                          ) : null}
                        </article>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        title={editing ? "Edit entry" : "New work entry"}
        description="Log the activity with time — notes are optional."
        onClose={() => !saving && setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={saving || !activity.trim()}
              onClick={() => void onSave()}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Save entry"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput
            label="What did you do?"
            required
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="Called 10 people, completed 3 follow-ups"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <TextInput
              label="Time"
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
          </div>
          <TextArea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Outcomes, next steps, or context"
            rows={3}
          />
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this entry?"
        message="This removes the log from your daily work history."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CircleCheck,
  NotebookPen,
  Plus,
  Target,
  Zap,
} from "lucide-react";
import {
  api,
  errorMessage,
  type DailyWorkCommitment,
  type DailyWorkLog,
  type WorkActivityOption,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { formatDate, toLocalDateInput } from "@/lib/dates";
import { personName } from "@/lib/labels";
import {
  entrySummary,
  pluralize,
  recentCombos,
  type QuickCombo,
} from "@/lib/work-activities";
import { Button, ConfirmDialog, ErrorState, LoadingState } from "@/components/ui";
import {
  WorkActivityBuilder,
  type BuilderSubmit,
} from "@/components/daily-work-logs/WorkActivityBuilder";
import { WorkEntryTable } from "@/components/daily-work-logs/WorkEntryTable";
import {
  CommitmentComposer,
  type CommitmentSubmit,
} from "@/components/daily-work-logs/CommitmentComposer";
import { WorkEvidenceDialog } from "@/components/daily-work-logs/WorkEvidenceDialog";

type DatePreset = "today" | "yesterday" | "week" | "custom";

type Props = {
  profileId?: string | null;
  authorUserId?: string | null;
  mode?: "author" | "review";
  showAuthor?: boolean;
  title?: string;
};

type BuilderState = {
  editing: DailyWorkLog | null;
  preset: { listItem: string; subItem: string | null } | null;
  key: number;
};

const HIGHLIGHT_MS = 4000;

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

function entryTitle(entry: DailyWorkLog) {
  if (!entry.listItemLabel) return `"${entry.activity}"`;
  const label = [entry.listItemLabel, entry.subItemLabel].filter(Boolean).join(" · ");
  return entry.count != null ? `${label} (${entry.count})` : label;
}

/** Newest first, so a just-added row lands at the top of its table. */
function byLoggedAt(a: DailyWorkLog, b: DailyWorkLog) {
  return b.loggedAt.localeCompare(a.loggedAt);
}

export function DailyWorkLogPanel({
  profileId = null,
  authorUserId = null,
  mode = "review",
  showAuthor = false,
  title = "Daily Work Log",
}: Props) {
  const { token, hasPermission } = useAuth();
  const canCreate = hasPermission("DAILY_WORK_LOG_CREATE") && mode === "author";
  const canView = hasPermission("DAILY_WORK_LOG_VIEW");

  const [preset, setPreset] = useState<DatePreset>("today");
  const [customDate, setCustomDate] = useState(toLocalDateInput());
  const [logs, setLogs] = useState<DailyWorkLog[]>([]);
  const [commitRows, setCommitRows] = useState<DailyWorkLog[]>([]);
  const [commitNotes, setCommitNotes] = useState<DailyWorkCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activities, setActivities] = useState<WorkActivityOption[]>([]);
  const [recent, setRecent] = useState<DailyWorkLog[]>([]);
  const [builder, setBuilder] = useState<BuilderState | null>(null);
  const [composerKey, setComposerKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [pendingDelete, setPendingDelete] = useState<DailyWorkLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [evidenceEntry, setEvidenceEntry] = useState<DailyWorkLog | null>(null);

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

  const todayKey = toLocalDateInput();
  const fromKey = toLocalDateInput(range.dateFrom);
  const toKey = toLocalDateInput(range.dateTo);
  const includesToday = fromKey <= todayKey && todayKey <= toKey;
  const canCommitToday = canCreate && includesToday;
  const canAddToday = canCommitToday && activities.length > 0;
  const multiDay = preset === "week";

  const hasCommitmentToday =
    commitNotes.some((c) => c.commitDate === todayKey) ||
    commitRows.some((r) => toLocalDateInput(r.loggedAt) === todayKey);
  const needsCommitment =
    canCreate && includesToday && !loading && !error && !hasCommitmentToday;
  /** One commitment per author per day, built from the activity list. */
  const canAddCommitment = needsCommitment && activities.length > 0;

  const load = useCallback(async () => {
    if (!token || !canView) return;
    setLoading(true);
    try {
      const filter = {
        profileId: profileId ?? undefined,
        authorUserId: authorUserId ?? undefined,
      };
      const [logRes, commitRes, noteRes] = await Promise.all([
        api.getDailyWorkLogs(token, {
          ...filter,
          kind: "LOG",
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          pageSize: 100,
        }),
        api.getDailyWorkLogs(token, {
          ...filter,
          kind: "COMMITMENT",
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          pageSize: 100,
        }),
        api.getDailyWorkCommitments(token, {
          ...filter,
          dateFrom: toLocalDateInput(range.dateFrom),
          dateTo: toLocalDateInput(range.dateTo),
        }),
      ]);
      setLogs([...logRes.data.logs].sort(byLoggedAt));
      setCommitRows([...commitRes.data.logs].sort(byLoggedAt));
      setCommitNotes(noteRes.data.commitments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load work logs");
      setLogs([]);
      setCommitRows([]);
      setCommitNotes([]);
    } finally {
      setLoading(false);
    }
  }, [token, canView, profileId, authorUserId, range.dateFrom, range.dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || !canCreate) return;
    let cancelled = false;
    void Promise.all([
      api.getWorkActivityOptions(token),
      api.getDailyWorkLogs(token, {
        kind: "LOG",
        profileId: profileId ?? undefined,
        authorUserId: authorUserId ?? undefined,
        pageSize: 100,
      }),
    ])
      .then(([optionsRes, recentRes]) => {
        if (cancelled) return;
        setActivities(optionsRes.data.activities);
        setRecent(recentRes.data.logs);
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err, "Unable to load activities"));
      });
    return () => {
      cancelled = true;
    };
  }, [token, canCreate, profileId, authorUserId]);

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (builder) builderRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [builder]);

  useEffect(() => {
    if (composerKey !== null) {
      composerRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
  }, [composerKey]);

  const quickCombos = useMemo(
    () => recentCombos(recent, activities),
    [recent, activities],
  );

  function flash(id: string) {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightId(id);
    highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }

  function openBuilder(
    editing: DailyWorkLog | null = null,
    combo: QuickCombo | null = null,
  ) {
    setBuilder({
      editing,
      preset: combo ? { listItem: combo.listItem, subItem: combo.subItem } : null,
      key: Date.now(),
    });
  }

  async function saveEntry(state: BuilderState, value: BuilderSubmit) {
    if (!token) return;
    setSaving(true);
    try {
      if (state.editing) {
        const res = await api.updateDailyWorkLog(token, state.editing.id, {
          ...value.input,
          attachments: value.attachments,
          removeAttachmentIds: value.removeAttachmentIds,
        });
        const saved = res.data.log;
        setLogs((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
        setRecent((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
        flash(saved.id);
        toast.success("Activity updated");
      } else {
        const res = await api.createDailyWorkLog(token, {
          kind: "LOG",
          ...value.input,
          loggedAt: new Date().toISOString(),
          attachments: value.attachments,
        });
        const saved = res.data.log;
        setLogs((prev) => [...prev, saved].sort(byLoggedAt));
        setRecent((prev) => [saved, ...prev]);
        flash(saved.id);
        toast.success("Activity added");
      }
      setBuilder(null);
    } catch (err) {
      toast.error(errorMessage(err, "Unable to save"));
    } finally {
      setSaving(false);
    }
  }

  async function saveCommitment(value: CommitmentSubmit) {
    if (!token) return;
    setSaving(true);
    try {
      const res = await api.createCommitmentPlan(token, value);
      const { logs: saved, commitment } = res.data;
      setCommitRows((prev) => [...prev, ...saved].sort(byLoggedAt));
      if (commitment) setCommitNotes((prev) => [...prev, commitment]);
      if (saved[0]) flash(saved[0].id);
      toast.success("Commitment added");
      setComposerKey(null);
    } catch (err) {
      toast.error(errorMessage(err, "Unable to save commitment"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteDailyWorkLog(token, pendingDelete.id);
      setLogs((prev) => prev.filter((l) => l.id !== pendingDelete.id));
      setRecent((prev) => prev.filter((l) => l.id !== pendingDelete.id));
      if (builder?.editing?.id === pendingDelete.id) setBuilder(null);
      toast.success("Activity deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, "Unable to delete activity"));
    } finally {
      setDeleting(false);
    }
  }

  if (!canView) {
    return (
      <ErrorState message="You do not have permission to view daily work logs." />
    );
  }

  const logSummary = entrySummary(logs);
  const authorName =
    showAuthor && (logs[0] ?? commitRows[0])
      ? personName((logs[0] ?? commitRows[0]).author)
      : null;
  const notesInRange = commitNotes.filter(
    (c) => c.commitDate >= fromKey && c.commitDate <= toKey,
  );

  return (
    <div className="dwl-page wl-page">
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
            {authorName ? (
              <>
                <span className="dwl-date-sep" aria-hidden>
                  ·
                </span>
                {authorName}
              </>
            ) : null}
          </p>
        </div>
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
      </div>

      {loading ? (
        <div className="dwl-state">
          <LoadingState label="Loading work logs…" />
        </div>
      ) : error ? (
        <div className="dwl-state">
          <ErrorState message={error} />
        </div>
      ) : (
        <div className="wl-sections">
          <section
            className={`wl-section is-commitment${needsCommitment ? " is-required" : ""}`}
            aria-labelledby="wl-commit-title"
          >
            <header className="wl-section-head">
              <div className="wl-section-copy">
                <p className="wl-section-kicker">
                  <Target size={12} strokeWidth={2.25} aria-hidden />
                  Plan
                </p>
                <h2 id="wl-commit-title" className="wl-section-title">
                  {preset === "today" ? "Today's Commitment" : "Commitment"}
                </h2>
                <p className="wl-section-desc">
                  {canCommitToday && hasCommitmentToday
                    ? "Your plan for today. It's locked once added."
                    : canCommitToday
                      ? "Pick what you plan to complete today and set a target for each. One commitment per day."
                      : "What was planned for this period."}
                </p>
              </div>
              <div className="wl-section-actions">
                {multiDay && commitRows.length > 0 ? (
                  <span className="wl-summary">
                    {pluralize(commitRows.length, "Commitment")}
                  </span>
                ) : null}
                {canAddCommitment && composerKey === null ? (
                  <Button
                    size="sm"
                    onClick={() => setComposerKey(Date.now())}
                  >
                    <Plus size={15} strokeWidth={2.25} aria-hidden />
                    Add Commitment
                  </Button>
                ) : null}
              </div>
            </header>

            {needsCommitment ? (
              <p className="wl-required-note">
                Add today&apos;s commitment before logging today&apos;s activities.
              </p>
            ) : null}

            {notesInRange.map((note) => (
              <div key={note.id} className="wl-note">
                <p className="wl-note-label">
                  Commitment note
                  {multiDay || note.commitDate !== todayKey
                    ? ` · ${formatDate(`${note.commitDate}T12:00:00`)}`
                    : ""}
                </p>
                <p className="wl-note-text">{note.commitment}</p>
              </div>
            ))}

            {canAddCommitment && composerKey !== null ? (
              <div ref={composerRef} className="wl-builder-slot">
                <CommitmentComposer
                  key={composerKey}
                  activities={activities}
                  busy={saving}
                  onSubmit={saveCommitment}
                  onCancel={() => !saving && setComposerKey(null)}
                />
              </div>
            ) : null}

            {commitRows.length > 0 || notesInRange.length === 0 ? (
              <WorkEntryTable
                variant="commitment"
                entries={commitRows}
                groupDays={multiDay}
                highlightId={highlightId}
                onViewEvidence={setEvidenceEntry}
                empty={
                  canAddCommitment ? (
                    <>
                      <p className="wl-empty-title">No commitment yet</p>
                      <p className="wl-empty-desc">
                        Pick what you plan to complete today.
                      </p>
                      {composerKey === null ? (
                        <Button size="sm" onClick={() => setComposerKey(Date.now())}>
                          <Plus size={15} strokeWidth={2.25} aria-hidden />
                          Add Commitment
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <p className="wl-empty-desc">No commitments for this period.</p>
                  )
                }
              />
            ) : null}
          </section>

          <section className="wl-section is-log" aria-labelledby="wl-log-title">
            <header className="wl-section-head">
              <div className="wl-section-copy">
                <p className="wl-section-kicker">
                  <CircleCheck size={12} strokeWidth={2.25} aria-hidden />
                  Done
                </p>
                <h2 id="wl-log-title" className="wl-section-title">
                  Daily Log
                </h2>
                <p className="wl-section-desc">
                  {canCreate && includesToday
                    ? "Track what you completed today."
                    : "Activities completed in this period."}
                </p>
              </div>
              <div className="wl-section-actions">
                {logs.length > 0 ? (
                  <span className="wl-summary">
                    {pluralize(logSummary.activities, "Activity", "Activities")} ·{" "}
                    {pluralize(logSummary.tasks, "Task")}
                  </span>
                ) : null}
                {canAddToday ? (
                  <Button
                    size="sm"
                    disabled={needsCommitment}
                    title={needsCommitment ? "Add today's commitment first" : undefined}
                    onClick={() => openBuilder()}
                  >
                    <Plus size={15} strokeWidth={2.25} aria-hidden />
                    Add Activity
                  </Button>
                ) : null}
              </div>
            </header>

            {canAddToday && !needsCommitment && quickCombos.length > 0 ? (
              <div className="wl-quick" aria-label="Quick add">
                <span className="wl-quick-label">
                  <Zap size={12} strokeWidth={2.25} aria-hidden />
                  Quick Add
                </span>
                {quickCombos.map((combo) => (
                  <button
                    key={combo.key}
                    type="button"
                    className="wl-quick-chip"
                    onClick={() => openBuilder(null, combo)}
                  >
                    {combo.label}
                  </button>
                ))}
              </div>
            ) : null}

            {builder ? (
              <div ref={builderRef} className="wl-builder-slot">
                <WorkActivityBuilder
                  key={builder.key}
                  activities={activities}
                  editing={builder.editing}
                  preset={builder.preset}
                  busy={saving}
                  onSubmit={(value) => saveEntry(builder, value)}
                  onCancel={() => !saving && setBuilder(null)}
                />
              </div>
            ) : null}

            <WorkEntryTable
              variant="log"
              entries={logs}
              canEdit={canCreate}
              groupDays={multiDay}
              highlightId={highlightId}
              editingId={builder?.editing?.id ?? null}
              onEdit={(entry) => openBuilder(entry)}
              onDelete={setPendingDelete}
              onViewEvidence={setEvidenceEntry}
              empty={
                canAddToday ? (
                  <>
                    <p className="wl-empty-title">No activities logged yet</p>
                    <p className="wl-empty-desc">
                      {needsCommitment
                        ? "Add today's commitment above, then log your work."
                        : "Start by adding what you worked on today."}
                    </p>
                    {!needsCommitment && !builder ? (
                      <Button size="sm" onClick={() => openBuilder()}>
                        <Plus size={15} strokeWidth={2.25} aria-hidden />
                        Add Activity
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p className="wl-empty-desc">No activities logged for this period.</p>
                )
              }
            />
          </section>
        </div>
      )}

      {/* Portaled so no ancestor (scroll container, transform) can clip them. */}
      {evidenceEntry
        ? createPortal(
            <WorkEvidenceDialog
              entry={evidenceEntry}
              onClose={() => setEvidenceEntry(null)}
            />,
            document.body,
          )
        : null}

      {pendingDelete
        ? createPortal(
            <ConfirmDialog
              open
              title="Delete this activity?"
              message={`${entryTitle(pendingDelete)} will be removed from your Daily Log.`}
              confirmLabel="Delete"
              danger
              busy={deleting}
              onCancel={() => !deleting && setPendingDelete(null)}
              onConfirm={() => void confirmDelete()}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

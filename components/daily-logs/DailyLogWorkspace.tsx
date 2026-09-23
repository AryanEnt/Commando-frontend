"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  api,
  ApiError,
  type DailyLog,
  type DailyLogEntry,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  ConfirmDialog,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import {
  DailyLogEntryForm,
  type EntryFormValues,
} from "@/components/daily-logs/DailyLogEntryForm";
import {
  DailyLogPrioritizeFlow,
  type Classification,
} from "@/components/daily-logs/DailyLogPrioritizeFlow";

type Mode = "workspace" | "add" | "edit" | "prioritize";

function formatEntryTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeSaved(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hr ago";
  return `${hrs} hrs ago`;
}

export function DailyLogWorkspace({
  logId,
  backHref,
}: {
  logId: string;
  backHref: string;
  profileId?: string;
}) {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [log, setLog] = useState<DailyLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("workspace");
  const [editing, setEditing] = useState<DailyLogEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const canWrite = hasPermission("DAILY_LOG_CREATE");

  const load = useCallback(async () => {
    if (!token || !logId) return;
    setLoading(true);
    try {
      const res = await api.getDailyLog(token, logId);
      setLog(res.data.log);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setLog(null);
    } finally {
      setLoading(false);
    }
  }, [token, logId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!justAddedId) return;
    const t = window.setTimeout(() => setJustAddedId(null), 2500);
    return () => window.clearTimeout(t);
  }, [justAddedId]);

  const lastSavedLabel = useMemo(
    () => (log ? relativeSaved(log.updatedAt) : null),
    [log],
  );

  async function saveEntry(values: EntryFormValues) {
    if (!token || !log) return;
    setBusy(true);
    try {
      const body = {
        activityTypeId: values.activityTypeId,
        sessionTitle: values.sessionTitle.trim(),
        observation: values.observation.trim(),
        evidence: values.evidence.trim() || null,
        seResponse: values.seResponse.trim() || null,
        coachingGiven: values.coachingGiven.trim() || null,
        expectedChange: values.expectedChange.trim() || null,
        followUp: values.followUp.trim() || null,
      };
      const wasEdit = mode === "edit" && editing;
      const res = wasEdit
        ? await api.updateDailyLogEntry(token, log.id, editing.id, body)
        : await api.addDailyLogEntry(token, log.id, body);
      setLog(res.data.log);
      if (!wasEdit) {
        const newest = res.data.log.entries[res.data.log.entries.length - 1];
        if (newest) setJustAddedId(newest.id);
      }
      setMode("workspace");
      setEditing(null);
      pushToast(wasEdit ? "Activity updated" : "Activity added", "success");
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Failed to save entry",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!token || !log || !deleteId) return;
    setBusy(true);
    try {
      const res = await api.deleteDailyLogEntry(token, log.id, deleteId);
      setLog(res.data.log);
      setDeleteId(null);
      pushToast("Activity removed", "success");
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Failed to delete",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitPrioritize(classifications: Classification[]) {
    if (!token || !log) return;
    setBusy(true);
    try {
      const res = await api.submitDailyLog(token, log.id, { classifications });
      setLog(res.data.log);
      setMode("workspace");
      pushToast(
        `Daily Log submitted · ${res.data.prioritizedCount} prioritized for Eisenhower`,
        "success",
      );
      router.push(
        log.salesExecutiveProfileId
          ? `/profiles/${log.salesExecutiveProfileId}/eisenhower`
          : log.executiveUserId
            ? `/support/${log.executiveUserId}/coaching`
            : "/daily-logs",
      );
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Failed to submit",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading && !log) return <LoadingState label="Loading Daily Log…" />;
  if (error && !log) return <ErrorState message={error} />;
  if (!log) return null;

  const draft = log.status === "DRAFT";

  if (mode === "prioritize" && draft) {
    return (
      <DailyLogPrioritizeFlow
        log={log}
        submitting={busy}
        onBackToEntries={() => setMode("workspace")}
        onSubmit={onSubmitPrioritize}
      />
    );
  }

  const composing = mode === "add" || mode === "edit";

  return (
    <div className="relative space-y-5 pb-4">
      <header className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          ← Daily Logs
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Daily Log
          </h1>
          <p className="mt-1 text-[1.125rem] text-[var(--color-ink)]">
            {formatDate(log.logDate)}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {log.profile?.displayName ??
              (log.executiveUser
                ? `${log.executiveUser.firstName} ${log.executiveUser.lastName}`
                : "Sales Support")}
            {log.assignment?.commando
              ? ` · Commando ${personName(log.assignment.commando)}`
              : ""}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={log.status} />
            <span className="text-[13px] tabular-nums text-[var(--color-ink-muted)]">
              {log.entryCount}{" "}
              {log.entryCount === 1 ? "activity" : "activities"}
            </span>
            {draft && lastSavedLabel ? (
              <span className="text-[13px] text-[var(--color-ink-subtle)]">
                Last saved {lastSavedLabel}
              </span>
            ) : null}
            {log.submittedAt ? (
              <span className="text-[13px] text-[var(--color-ink-subtle)]">
                Submitted {formatEntryTime(log.submittedAt)}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {justAddedId ? (
        <p
          className="rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-brand-dark)]"
          role="status"
        >
          ✓ Activity added
        </p>
      ) : null}

      {log.entries.length === 0 && !composing ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-10 text-center">
          <p className="font-medium text-[var(--color-ink)]">
            No activities yet
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Capture coaching moments as they happen today.
          </p>
          {draft && canWrite ? (
            <Button
              type="button"
              className="mt-4"
              size="sm"
              onClick={() => {
                setEditing(null);
                setMode("add");
              }}
            >
              + Add activity
            </Button>
          ) : null}
        </div>
      ) : null}

      {log.entries.length > 0 ? (
        <section aria-labelledby="today-timeline-heading">
          <h2
            id="today-timeline-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]"
          >
            Today
          </h2>
          <ol className="relative mt-3 space-y-0 border-l-2 border-[var(--color-brand-ring)] pl-5">
            {log.entries.map((entry) => (
              <li key={entry.id} className="relative pb-6 last:pb-0">
                <span
                  className="absolute -left-[1.55rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-brand)] bg-[var(--color-surface)]"
                  aria-hidden
                />
                <TimelineCard
                  entry={entry}
                  submitted={log.status === "SUBMITTED"}
                  highlight={entry.id === justAddedId}
                  canEdit={draft && canWrite && !composing}
                  onEdit={() => {
                    setEditing(entry);
                    setMode("edit");
                  }}
                  onDelete={() => setDeleteId(entry.id)}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {composing ? (
        <section className="space-y-2" aria-labelledby="composer-heading">
          <h2
            id="composer-heading"
            className="text-sm font-semibold text-[var(--color-ink)]"
          >
            {mode === "edit" ? "Edit activity" : "Add activity"}
          </h2>
          <DailyLogEntryForm
            key={editing?.id ?? "new"}
            initial={editing}
            submitting={busy}
            submitLabel={mode === "edit" ? "Save changes" : "Add activity"}
            onCancel={() => {
              setMode("workspace");
              setEditing(null);
            }}
            onSubmit={saveEntry}
          />
        </section>
      ) : null}

      {draft && canWrite && !composing && log.entryCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setMode("add");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-brand-ring)] bg-[var(--color-brand-soft)]/40 px-4 py-3.5 text-sm font-semibold text-[var(--color-brand-dark)] transition hover:bg-[var(--color-brand-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          + Add another activity
        </button>
      ) : null}

      {draft && canWrite && !composing ? (
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/85 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              <span className="font-medium text-[var(--color-ink)]">
                {log.entryCount}{" "}
                {log.entryCount === 1 ? "activity" : "activities"}
              </span>
              <span className="mx-1.5 text-[var(--color-ink-subtle)]">·</span>
              Draft
              {lastSavedLabel ? (
                <span className="text-[var(--color-ink-subtle)]">
                  {" "}
                  · saved {lastSavedLabel}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setMode("add");
                }}
              >
                + Add activity
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={log.entryCount === 0}
                onClick={() => setMode("prioritize")}
              >
                Review & Submit
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Remove this activity?"
        message="This entry will be deleted from the Daily Log draft."
        confirmLabel="Remove"
        danger
        busy={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function TimelineCard({
  entry,
  submitted,
  highlight,
  canEdit,
  onEdit,
  onDelete,
}: {
  entry: DailyLogEntry;
  submitted: boolean;
  highlight: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={`rounded-[var(--radius-md)] border bg-[var(--color-surface)] p-4 transition ${
        highlight
          ? "border-[var(--color-brand)] shadow-[var(--shadow-sm)]"
          : "border-[var(--color-line)]"
      }`}
    >
      <p className="text-[12px] font-medium tabular-nums text-[var(--color-ink-subtle)]">
        {formatEntryTime(entry.loggedAt)}
      </p>
      <h3 className="mt-1 text-[1.0625rem] font-semibold text-[var(--color-ink)]">
        {entry.sessionTitle}
      </h3>
      <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
        {entry.activityType.name}
      </p>
      <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">
        {entry.observation}
      </p>
      <dl className="mt-3 space-y-2">
        <MetaBlock label="Evidence" value={entry.evidence} />
        <MetaBlock label="SE response" value={entry.seResponse} />
        <MetaBlock label="Coaching" value={entry.coachingGiven} />
        <MetaBlock label="Expected change" value={entry.expectedChange} />
        <MetaBlock label="Follow-up" value={entry.followUp} />
      </dl>
      {entry.eisenhowerCategory ? (
        <p className="mt-3 text-[12px] font-medium text-[var(--color-brand)]">
          Eisenhower · {entry.eisenhowerCategory.replaceAll("_", " ")}
        </p>
      ) : submitted ? (
        <p className="mt-3 text-[12px] text-[var(--color-ink-subtle)]">
          Not prioritized · Daily Log History only
        </p>
      ) : null}
      {canEdit ? (
        <div className="mt-3 flex justify-end gap-3 border-t border-[var(--color-line)] pt-2.5">
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--status-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}

function MetaBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type SupportTask } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDate, formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  DateTimeCell,
  ErrorState,
  LoadingState,
  TextArea,
} from "@/components/ui";

function personName(u: { firstName: string; lastName: string } | null) {
  if (!u) return "—";
  return `${u.firstName} ${u.lastName}`;
}

export default function MyTaskDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading task…" />}>
      <MyTaskDetail />
    </Suspense>
  );
}

function MyTaskDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { token, hasPermission, user } = useAuth();
  const { pushToast } = useToast();
  const [task, setTask] = useState<SupportTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [progressBody, setProgressBody] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);

  const canStatus = hasPermission("SALES_SUPPORT_TASK_STATUS_UPDATE");
  const isSupport = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";

  async function load() {
    if (!token || !params.id) return;
    const res = await api.getSupportTask(token, params.id);
    setTask(res.data.task);
    setCompletionNotes(res.data.task.completionNotes ?? "");
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params.id]);

  async function setStatus(
    status: SupportTask["status"],
    extra?: { completionNotes?: string | null; blockedReason?: string | null },
  ) {
    if (!token || !task) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.updateSupportTaskStatus(token, task.id, {
        status,
        ...extra,
      });
      setTask(res.data.task);
      setBlockOpen(false);
      pushToast("Task status updated", "success");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Status update failed";
      pushToast(msg, "error");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onAddProgress(e: FormEvent) {
    e.preventDefault();
    if (!token || !task || !progressBody.trim()) return;
    setBusy(true);
    try {
      const res = await api.addSupportTaskProgressNote(token, task.id, {
        body: progressBody.trim(),
      });
      setTask(res.data.task);
      setProgressBody("");
      pushToast("Progress note added", "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not add note";
      pushToast(msg, "error");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!hasPermission("SALES_SUPPORT_TASK_VIEW")) {
    return (
      <ErrorState message="You do not have permission to view support tasks." />
    );
  }

  const backHref =
    returnTo ||
    (task
      ? `/profiles/${task.salesExecutiveProfileId}/support`
      : "/my-tasks");
  const backLabel = returnTo
    ? "← Back to Support"
    : isSupport
      ? "← My Support Tasks"
      : "← Support Tasks";

  if (error && !task) {
    return (
      <div className="space-y-4">
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          {backLabel}
        </Link>
        <ErrorState message={error} onRetry={() => router.refresh()} />
      </div>
    );
  }

  if (!task) return <LoadingState label="Loading task…" />;

  const ownTask = isSupport && task.salesSupportUserId === user?.id;
  const canExecute = canStatus && (ownTask || !isSupport);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          {backLabel}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {task.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {task.profile.displayName}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={task.status} />
              {task.isOverdue && <StatusBadge status="OVERDUE" />}
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      <dl className="grid gap-3 rounded border border-[var(--color-line)] bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-[var(--color-ink-subtle)]">
            Support owner
          </dt>
          <dd className="mt-1 font-medium">
            {personName(task.salesSupportUser)}
            {task.salesSupportLink?.responsibilityType
              ? ` · ${task.salesSupportLink.responsibilityType}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[var(--color-ink-subtle)]">
            Assigned by
          </dt>
          <dd className="mt-1">{personName(task.assignedBy)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[var(--color-ink-subtle)]">
            Due
          </dt>
          <dd className="mt-1 tabular-nums">{formatDate(task.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[var(--color-ink-subtle)]">
            Updated
          </dt>
          <dd className="mt-1">
            <DateTimeCell value={task.updatedAt} />
          </dd>
        </div>
      </dl>

      {(task.purpose || task.description) && (
        <section className="surface p-4">
          <h2 className="text-sm font-semibold">What needs to be done</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
            {task.purpose || task.description}
          </p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[var(--radius-md)] border border-[var(--status-success-ring)] bg-[var(--status-success-bg)] p-4">
          <h2 className="text-sm font-semibold text-[var(--status-success)]">
            DO
          </h2>
          {(task.shouldDo?.length ?? 0) === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              No DO instructions.
            </p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {task.shouldDo.map((i) => (
                <li key={i.id}>{i.text}</li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-[var(--radius-md)] border border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] p-4">
          <h2 className="text-sm font-semibold text-[var(--status-danger)]">
            DON&apos;T
          </h2>
          {(task.shouldNotDo?.length ?? 0) === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              No DON&apos;T instructions.
            </p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {task.shouldNotDo.map((i) => (
                <li key={i.id}>{i.text}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {task.status === "BLOCKED" && task.blockedReason ? (
        <section
          className="border border-[var(--status-danger)]/30 bg-[var(--status-danger-bg)] px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-[var(--status-danger)]">Blocked</p>
          <p className="mt-1">{task.blockedReason}</p>
        </section>
      ) : null}

      {canExecute && task.status !== "COMPLETED" ? (
        <section className="surface space-y-3 p-4">
          <h2 className="text-sm font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {task.status === "PENDING" && isSupport ? (
              <Button
                disabled={busy}
                onClick={() => void setStatus("ACCEPTED")}
              >
                Accept task
              </Button>
            ) : null}
            {(task.status === "ACCEPTED" || task.status === "PENDING") &&
            isSupport ? (
              <Button
                disabled={busy}
                onClick={() => void setStatus("IN_PROGRESS")}
              >
                Start task
              </Button>
            ) : null}
            {(task.status === "IN_PROGRESS" || task.status === "ACCEPTED") &&
            isSupport ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setBlockOpen((v) => !v)}
              >
                Mark blocked
              </Button>
            ) : null}
            {task.status === "BLOCKED" && isSupport ? (
              <Button
                disabled={busy}
                onClick={() => void setStatus("IN_PROGRESS")}
              >
                Resume
              </Button>
            ) : null}
            {isSupport && task.status !== "PENDING" ? (
              <Button
                disabled={busy}
                onClick={() =>
                  void setStatus("COMPLETED", {
                    completionNotes: completionNotes.trim() || null,
                  })
                }
              >
                Mark completed
              </Button>
            ) : null}
          </div>

          {blockOpen ? (
            <div className="space-y-2 border-t border-[var(--color-line)] pt-3">
              <TextArea
                label="Blocked reason"
                required
                rows={3}
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
              />
              <Button
                disabled={busy || !blockedReason.trim()}
                onClick={() =>
                  void setStatus("BLOCKED", {
                    blockedReason: blockedReason.trim(),
                  })
                }
              >
                Confirm blocked
              </Button>
            </div>
          ) : null}

          {isSupport && task.status !== "PENDING" ? (
            <TextArea
              label="Completion note (optional)"
              rows={2}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
          ) : null}
        </section>
      ) : null}

      <section className="surface p-4">
        <h2 className="text-sm font-semibold">Progress</h2>
        {(task.progressNotes?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            No progress updates yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {task.progressNotes.map((n) => (
              <li key={n.id} className="text-sm">
                <p className="text-xs text-[var(--color-ink-subtle)]">
                  {formatDateTime(n.createdAt)} · {personName(n.createdBy)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
        {ownTask && task.status !== "COMPLETED" ? (
          <form onSubmit={onAddProgress} className="mt-4 space-y-2">
            <TextArea
              label="Add progress update"
              rows={2}
              value={progressBody}
              onChange={(e) => setProgressBody(e.target.value)}
            />
            <Button type="submit" disabled={busy || !progressBody.trim()}>
              Add update
            </Button>
          </form>
        ) : null}
      </section>

      {(task.assignmentHistory?.length ?? 0) > 0 ? (
        <section className="surface p-4">
          <h2 className="text-sm font-semibold">Assignment history</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {task.assignmentHistory.map((e) => (
              <li key={e.id}>
                <p className="text-xs text-[var(--color-ink-subtle)]">
                  {formatDateTime(e.createdAt)} · {personName(e.changedBy)}
                </p>
                <p>
                  Assigned to support user
                  {e.reason ? ` — ${e.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {task.completedAt ? (
        <section className="surface p-4 text-sm">
          <h2 className="text-sm font-semibold">Completed</h2>
          <p className="mt-1">
            <DateTimeCell value={task.completedAt} />
          </p>
          {task.completionNotes ? (
            <p className="mt-2 whitespace-pre-wrap">{task.completionNotes}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

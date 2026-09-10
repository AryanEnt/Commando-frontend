"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, type SupportTask } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  DateTimeCell,
  ErrorState,
  LoadingState,
  ReadOnlyPanel,
  SelectField,
  TextArea,
} from "@/components/ui";

function personName(u: { firstName: string; lastName: string } | null) {
  if (!u) return "—";
  return `${u.firstName} ${u.lastName}`;
}

export default function MyTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, hasPermission, user } = useAuth();
  const { pushToast } = useToast();
  const [task, setTask] = useState<SupportTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED">(
    "PENDING",
  );
  const [completionNotes, setCompletionNotes] = useState("");

  const canStatus = hasPermission("SALES_SUPPORT_TASK_STATUS_UPDATE");
  const canEdit = hasPermission("SALES_SUPPORT_TASK_UPDATE");

  async function load() {
    if (!token || !params.id) return;
    const res = await api.getSupportTask(token, params.id);
    setTask(res.data.task);
    setStatus(res.data.task.status);
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

  async function onStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !task) return;
    setBusy(true);
    try {
      const res = await api.updateSupportTaskStatus(token, task.id, {
        status,
        completionNotes: completionNotes.trim() || null,
      });
      setTask(res.data.task);
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

  if (!hasPermission("SALES_SUPPORT_TASK_VIEW")) {
    return (
      <ErrorState message="You do not have permission to view support tasks." />
    );
  }

  if (error && !task) {
    return (
      <div className="space-y-4">
        <Link href="/my-tasks" className="text-sm text-slate-600 underline">
          ← My Task
        </Link>
        <ErrorState message={error} onRetry={() => router.refresh()} />
      </div>
    );
  }

  if (!task) return <LoadingState label="Loading task…" />;

  const isSupport = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";
  const statusEditable = canStatus && (isSupport || canEdit);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/my-tasks" className="text-sm text-slate-600 underline">
          ← {isSupport ? "My Task" : "Support Tasks"}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {task.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={task.status} />
              <StatusBadge status={task.priority} />
              {task.isOverdue && <StatusBadge status="OVERDUE" />}
            </div>
          </div>
        </div>
      </div>

      <ReadOnlyPanel title="Task details">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Description
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-800">
              {task.description || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Assigned by
            </dt>
            <dd className="mt-1">{personName(task.assignedBy)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Sales Support
            </dt>
            <dd className="mt-1">{personName(task.salesSupportUser)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Related profile
            </dt>
            <dd className="mt-1">{task.profile.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Due date
            </dt>
            <dd
              className={`mt-1 ${task.isOverdue ? "font-medium text-amber-800" : ""}`}
            >
              {formatDate(task.dueDate)}
              {task.isOverdue ? " · Overdue" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Created
            </dt>
            <dd className="mt-1">
              <DateTimeCell value={task.createdAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Updated
            </dt>
            <dd className="mt-1">
              <DateTimeCell value={task.updatedAt} />
            </dd>
          </div>
          {task.completedAt && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Completed
              </dt>
              <dd className="mt-1">
                <DateTimeCell value={task.completedAt} />
              </dd>
              {task.completionNotes && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {task.completionNotes}
                </p>
              )}
            </div>
          )}
          {task.assignment && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Assignment context
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {task.assignment.status} · started{" "}
                {formatDate(task.assignment.startedAt)}
              </dd>
            </div>
          )}
        </dl>
      </ReadOnlyPanel>

      {statusEditable && (
        <form
          onSubmit={onStatusSubmit}
          className="space-y-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Update status
          </h2>
          <SelectField
            label="Status"
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as "PENDING" | "IN_PROGRESS" | "COMPLETED",
              )
            }
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </SelectField>
          <TextArea
            label="Completion notes"
            rows={3}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            hint="Optional notes when completing or updating progress"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save status"}
          </Button>
        </form>
      )}
    </div>
  );
}

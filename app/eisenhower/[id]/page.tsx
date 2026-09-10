"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  ApiError,
  type EisenhowerCategory,
  type EisenhowerStatus,
  type EisenhowerTask,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  DateTimeCell,
  ErrorState,
  LoadingState,
  Panel,
  ReadOnlyPanel,
  SelectField,
  TextArea,
  TextInput,
} from "@/components/ui";

const CATEGORIES: EisenhowerCategory[] = [
  "DO_FIRST",
  "SCHEDULE",
  "DELEGATE",
  "ELIMINATE",
];

const STATUSES: EisenhowerStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export default function EisenhowerTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [task, setTask] = useState<EisenhowerTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    notes: "",
    category: "DO_FIRST" as EisenhowerCategory,
    dueDate: "",
  });

  const canEdit = hasPermission("EISENHOWER_UPDATE");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getEisenhowerTask(token, params.id);
        if (!cancelled) {
          setTask(res.data.task);
          setForm({
            title: res.data.task.title,
            notes: res.data.task.notes ?? "",
            category: res.data.task.category,
            dueDate: res.data.task.dueDate
              ? new Date(res.data.task.dueDate).toISOString().slice(0, 10)
              : "",
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !task) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.updateEisenhowerTask(token, task.id, {
        title: form.title,
        notes: form.notes.trim() || null,
        category: form.category,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : null,
      });
      setTask(res.data.task);
      setEditing(false);
      pushToast("Task updated", "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(status: EisenhowerStatus) {
    if (!token || !task) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.updateEisenhowerTaskStatus(token, task.id, status);
      setTask(res.data.task);
      pushToast("Status updated", "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  if (error && !task) {
    return (
      <div className="space-y-2">
        <Link href="/eisenhower" className="text-sm text-slate-600 underline">
          ← Eisenhower
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!task) return <LoadingState />;

  const detailPanel = task.isHistory ? (
    <ReadOnlyPanel title="Eisenhower task">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Due</dt>
          <dd className="tabular-nums">{formatDate(task.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Created by</dt>
          <dd>
            {task.createdBy.firstName} {task.createdBy.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Assignment</dt>
          <dd className="font-mono text-xs">{task.assignmentId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Updated</dt>
          <dd>
            <DateTimeCell value={task.updatedAt} />
          </dd>
        </div>
      </dl>
      <div>
        <h2 className="text-xs uppercase text-slate-500">Notes</h2>
        <p className="mt-2 whitespace-pre-wrap">{task.notes ?? "—"}</p>
      </div>
    </ReadOnlyPanel>
  ) : (
    <Panel title="Current month task" tone="active">
      <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Due</dt>
          <dd className="tabular-nums">{formatDate(task.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Created by</dt>
          <dd>
            {task.createdBy.firstName} {task.createdBy.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Assignment</dt>
          <dd className="font-mono text-xs">{task.assignmentId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Updated</dt>
          <dd>
            <DateTimeCell value={task.updatedAt} />
          </dd>
        </div>
      </dl>
      <div className="border-t border-slate-100 p-4">
        <h2 className="text-xs uppercase text-slate-500">Notes</h2>
        <p className="mt-2 whitespace-pre-wrap">{task.notes ?? "—"}</p>
      </div>
    </Panel>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/eisenhower" className="text-sm text-slate-600 underline">
            ← Eisenhower
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {task.title}
          </h1>
          <p className="text-sm text-slate-600">
            {task.profile.displayName} · {task.monthLabel} · {task.category}
            {task.isHistory ? " · history" : " · current month"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={task.status} />
            {task.isExpired && <StatusBadge status="EXPIRED" />}
          </div>
        </div>
        {canEdit && !editing && !task.isHistory && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} />}

      {canEdit && !task.isHistory && (
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant="secondary"
              size="sm"
              disabled={busy || task.status === s}
              onClick={() => void onStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {editing && !task.isHistory ? (
        <form
          onSubmit={onSave}
          className="space-y-4 rounded border border-slate-200 bg-white p-4"
        >
          <TextInput
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <SelectField
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value as EisenhowerCategory,
              })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <TextArea
            label="Notes"
            rows={4}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <TextInput
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        detailPanel
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type ActionItemDetail } from "@/lib/api";
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
  TextArea,
  TextInput,
} from "@/components/ui";

export default function ActionItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [item, setItem] = useState<ActionItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [replaceForm, setReplaceForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });

  const canUpdate = hasPermission("ACTION_ITEM_UPDATE");

  async function load() {
    if (!token || !params.id) return;
    const res = await api.getActionItem(token, params.id);
    setItem(res.data.actionItem);
    setForm({
      title: res.data.actionItem.title,
      description: res.data.actionItem.description ?? "",
      dueDate: res.data.actionItem.dueDate
        ? new Date(res.data.actionItem.dueDate).toISOString().slice(0, 10)
        : "",
    });
    setReplaceForm({
      title: res.data.actionItem.title,
      description: res.data.actionItem.description ?? "",
      dueDate: res.data.actionItem.dueDate
        ? new Date(res.data.actionItem.dueDate).toISOString().slice(0, 10)
        : "",
    });
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

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateActionItem(token, item.id, {
        title: form.title,
        description: form.description.trim() || null,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : null,
      });
      setEditing(false);
      pushToast("Action item updated", "success");
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function runLifecycle(action: "complete" | "expire") {
    if (!token || !item) return;
    setBusy(true);
    setError(null);
    try {
      const fn =
        action === "complete" ? api.completeActionItem : api.expireActionItem;
      await fn(token, item.id);
      pushToast(
        action === "complete" ? "Action item completed" : "Action item expired",
        "success",
      );
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onReplace(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.replaceActionItem(token, item.id, {
        title: replaceForm.title,
        description: replaceForm.description.trim() || null,
        dueDate: replaceForm.dueDate
          ? new Date(replaceForm.dueDate).toISOString()
          : null,
      });
      pushToast("Replacement action item created", "success");
      router.replace(`/action-items/${res.data.actionItem.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to replace";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  if (error && !item) {
    return (
      <div className="space-y-2">
        <Link href="/profiles" className="text-sm text-slate-600 underline">
          ← Sales Executives
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!item) return <LoadingState />;

  function personName(p: { firstName: string; lastName: string } | null) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  const backHref = `/profiles/${item.salesExecutiveProfileId}/actions`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            ← Back to {item.profile.displayName}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {item.title}
          </h1>
          <p className="text-sm text-slate-600">
            {item.profile.displayName} ·{" "}
            {item.isActive ? "Active" : "History"}
          </p>
          <div className="mt-2">
            <StatusBadge status={item.status} />
          </div>
        </div>
        {canUpdate && item.isActive && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void runLifecycle("complete")}
            >
              Complete
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void runLifecycle("expire")}
            >
              Expire
            </Button>
            <Button onClick={() => setReplacing((v) => !v)}>Replace</Button>
          </div>
        )}
      </div>

      {error && <ErrorState message={error} />}

      {item.isActive ? (
        <Panel title="Active action item" tone="active">
          <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-500">Commando</dt>
              <dd>{personName(item.commando)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Due</dt>
              <dd className="tabular-nums">{formatDate(item.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Created</dt>
              <dd>
                <DateTimeCell value={item.createdAt} /> by{" "}
                {item.createdBy.firstName} {item.createdBy.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Assignment</dt>
              <dd className="font-mono text-xs">{item.assignmentId ?? "—"}</dd>
            </div>
          </dl>
        </Panel>
      ) : (
        <ReadOnlyPanel title="Action item history">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-500">Commando</dt>
              <dd>{personName(item.commando)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Due</dt>
              <dd className="tabular-nums">{formatDate(item.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Created</dt>
              <dd>
                <DateTimeCell value={item.createdAt} /> by{" "}
                {item.createdBy.firstName} {item.createdBy.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Assignment</dt>
              <dd className="font-mono text-xs">{item.assignmentId ?? "—"}</dd>
            </div>
          </dl>
        </ReadOnlyPanel>
      )}

      {editing && item.isActive ? (
        <form
          onSubmit={onSave}
          className="space-y-3 rounded border border-slate-200 bg-white p-4"
        >
          <TextInput
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextArea
            label="Description"
            rows={4}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <TextInput
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </form>
      ) : (
        <div className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-xs uppercase text-slate-500">Description</h2>
          <p className="mt-2 whitespace-pre-wrap">
            {item.description ?? "—"}
          </p>
        </div>
      )}

      {replacing && item.isActive && (
        <form
          onSubmit={onReplace}
          className="space-y-3 rounded border border-amber-200 bg-amber-50/40 p-4"
        >
          <p className="text-xs text-amber-900">
            Replace marks this item REPLACED (kept in History) and creates a new
            ACTIVE item.
          </p>
          <TextInput
            label="New title"
            required
            value={replaceForm.title}
            onChange={(e) =>
              setReplaceForm({ ...replaceForm, title: e.target.value })
            }
          />
          <TextArea
            label="New description"
            rows={3}
            value={replaceForm.description}
            onChange={(e) =>
              setReplaceForm({
                ...replaceForm,
                description: e.target.value,
              })
            }
          />
          <TextInput
            label="Due date"
            type="date"
            value={replaceForm.dueDate}
            onChange={(e) =>
              setReplaceForm({ ...replaceForm, dueDate: e.target.value })
            }
          />
          <Button type="submit" disabled={busy}>
            Create replacement
          </Button>
        </form>
      )}

      {item.previousActions.length > 0 && (
        <Panel title="Previous actions" tone="history">
          <ul className="divide-y divide-slate-100 p-4 text-sm">
            {item.previousActions.map((prev) => (
              <li key={prev.id} className="flex justify-between gap-2 py-2">
                <Link
                  href={`/action-items/${prev.id}`}
                  className="underline underline-offset-2"
                >
                  {prev.title}
                </Link>
                <StatusBadge status={prev.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

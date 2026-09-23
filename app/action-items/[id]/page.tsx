"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ActionItemDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { dueIsoFromInputs, formatDue, toLocalDateInput, toLocalTimeInput } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { DueDateTimePicker } from "@/components/DueDateTimePicker";
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
import { ActionItemScreenshots } from "@/components/action-items/ActionItemScreenshots";

export default function ActionItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [item, setItem] = useState<ActionItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    summary: "",
    dueDate: "",
    dueTime: "",
  });
  const [replaceForm, setReplaceForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
  });
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const summaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryBaseline = useRef<string>("");
  const skipSummaryAutosave = useRef(true);

  const canUpdate = hasPermission("ACTION_ITEM_UPDATE");
  const canCompleteOwn =
    canUpdate ||
    (user?.roleCode === "SALES_EXECUTIVE" &&
      item?.profile.userId === user.id);
  const canUploadScreenshot =
    !!item?.isActive &&
    (canUpdate ||
      (user?.roleCode === "SALES_EXECUTIVE" &&
        item.profile.userId === user.id));
  const canEditSummary = canUploadScreenshot;
  const canRemoveScreenshot = canUploadScreenshot;

  async function load() {
    if (!token || !params.id) return;
    const res = await api.getActionItem(token, params.id);
    setItem(res.data.actionItem);
    const summary = res.data.actionItem.summary ?? "";
    summaryBaseline.current = summary;
    skipSummaryAutosave.current = true;
    setSummaryDraft(summary);
    setSummaryStatus("idle");
    setForm({
      title: res.data.actionItem.title,
      description: res.data.actionItem.description ?? "",
      summary,
      dueDate: toLocalDateInput(res.data.actionItem.dueDate),
      dueTime: res.data.actionItem.dueDate
        ? toLocalTimeInput(res.data.actionItem.dueDate)
        : "",
    });
    setReplaceForm({
      title: res.data.actionItem.title,
      description: res.data.actionItem.description ?? "",
      dueDate: toLocalDateInput(res.data.actionItem.dueDate),
      dueTime: res.data.actionItem.dueDate
        ? toLocalTimeInput(res.data.actionItem.dueDate)
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

  useEffect(() => {
    if (!token || !item?.id || !canEditSummary) return;
    if (skipSummaryAutosave.current) {
      skipSummaryAutosave.current = false;
      return;
    }
    const next = summaryDraft.trim();
    const prev = summaryBaseline.current.trim();
    if (next === prev) {
      setSummaryStatus("idle");
      return;
    }
    if (summaryTimer.current) clearTimeout(summaryTimer.current);
    setSummaryStatus("saving");
    const actionItemId = item.id;
    summaryTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await api.updateActionItemSummary(token, actionItemId, {
            summary: next || null,
          });
          summaryBaseline.current = res.data.actionItem.summary ?? "";
          setItem(res.data.actionItem);
          setSummaryStatus("saved");
        } catch (err) {
          setSummaryStatus("error");
          pushToast(
            err instanceof ApiError ? err.message : "Failed to save summary",
            "error",
          );
        }
      })();
    }, 700);
    return () => {
      if (summaryTimer.current) clearTimeout(summaryTimer.current);
    };
  }, [summaryDraft, token, item?.id, canEditSummary, pushToast]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateActionItem(token, item.id, {
        title: form.title,
        description: form.description.trim() || null,
        summary: form.summary.trim() || null,
        dueDate: dueIsoFromInputs(form.dueDate, form.dueTime),
      });
      setEditing(false);
      pushToast("Assignment updated", "success");
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
        action === "complete" ? "Assignment completed" : "Assignment expired",
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
        dueDate: dueIsoFromInputs(replaceForm.dueDate, replaceForm.dueTime),
      });
      pushToast("Replacement assignment created", "success");
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
        {item.isActive && (
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <>
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
              </>
            ) : canCompleteOwn ? (
              <Button
                variant="success"
                disabled={busy}
                onClick={() => void runLifecycle("complete")}
              >
                {busy ? "Completing…" : "Complete"}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {error && <ErrorState message={error} />}

      {item.isActive ? (
        <Panel title="Active assignment" tone="active">
          <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-500">Commando</dt>
              <dd>{personName(item.commando)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Due</dt>
              <dd className="tabular-nums">{formatDue(item.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Created</dt>
              <dd>
                <DateTimeCell value={item.createdAt} /> by{" "}
                {item.createdBy.firstName} {item.createdBy.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Commando assignment
              </dt>
              <dd className="font-mono text-xs">{item.assignmentId ?? "—"}</dd>
            </div>
          </dl>
        </Panel>
      ) : (
        <ReadOnlyPanel title="Assignment history">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-500">Commando</dt>
              <dd>{personName(item.commando)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Due</dt>
              <dd className="tabular-nums">{formatDue(item.dueDate)}</dd>
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
          <TextArea
            label="Summary (optional)"
            rows={3}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
          <DueDateTimePicker
            date={form.dueDate}
            time={form.dueTime}
            disabled={busy}
            onChange={({ date, time }) =>
              setForm((f) => ({ ...f, dueDate: date, dueTime: time }))
            }
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

      {canEditSummary && !(editing && canUpdate) ? (
        <div className="space-y-2 rounded border border-slate-200 bg-white p-4">
          <TextArea
            label="Summary (optional)"
            rows={3}
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            placeholder="Brief note on what was done or observed…"
          />
          <p className="text-xs text-slate-500">
            {summaryStatus === "saving"
              ? "Saving…"
              : summaryStatus === "saved"
                ? "Saved"
                : summaryStatus === "error"
                  ? "Could not save — keep typing to retry"
                  : "Autosaves as you type"}
          </p>
        </div>
      ) : !canEditSummary ? (
        <div className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-xs uppercase text-slate-500">
            Summary{" "}
            <span className="normal-case text-slate-400">(optional)</span>
          </h2>
          <p className="mt-2 whitespace-pre-wrap">
            {item.summary?.trim() ? item.summary : "—"}
          </p>
        </div>
      ) : null}

      {token ? (
        <ActionItemScreenshots
          token={token}
          item={item}
          canUpload={canUploadScreenshot}
          canRemove={canRemoveScreenshot}
          currentUserId={user?.id}
          onItemUpdated={setItem}
        />
      ) : null}

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
          <DueDateTimePicker
            date={replaceForm.dueDate}
            time={replaceForm.dueTime}
            disabled={busy}
            onChange={({ date, time }) =>
              setReplaceForm((f) => ({ ...f, dueDate: date, dueTime: time }))
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

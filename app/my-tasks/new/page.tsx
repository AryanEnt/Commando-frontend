"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type SyncSupportLink } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  LoadingState,
  SelectField,
  TextArea,
  TextInput,
} from "@/components/ui";

export default function NewSupportTaskPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewSupportTaskForm />
    </Suspense>
  );
}

function NewSupportTaskForm() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedProfileId = searchParams.get("profileId") ?? "";
  const returnTo = searchParams.get("returnTo");

  const [links, setLinks] = useState<SyncSupportLink[]>([]);
  const [lockedProfileName, setLockedProfileName] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState({
    title: "",
    description: "",
    purpose: "",
    salesExecutiveProfileId: lockedProfileId,
    salesSupportUserId: "",
    priority: "MEDIUM" as "HIGH" | "MEDIUM" | "LOW",
    dueDate: "",
  });
  const [shouldDo, setShouldDo] = useState<string[]>([""]);
  const [shouldNotDo, setShouldNotDo] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockedProfileId) {
      setForm((f) => ({ ...f, salesExecutiveProfileId: lockedProfileId }));
    }
  }, [lockedProfileId]);

  useEffect(() => {
    if (!token || !lockedProfileId) {
      setLockedProfileName(null);
      return;
    }
    void api
      .getProfile(token, lockedProfileId)
      .then((res) => setLockedProfileName(res.data.profile.displayName))
      .catch(() => setLockedProfileName(null));
  }, [token, lockedProfileId]);

  useEffect(() => {
    if (!token || !form.salesExecutiveProfileId) {
      setLinks([]);
      setForm((f) => ({ ...f, salesSupportUserId: "" }));
      return;
    }
    void api
      .getSyncEvaluationSupportLinks(token, form.salesExecutiveProfileId)
      .then((res) => setLinks(res.data.links))
      .catch(() => setLinks([]));
  }, [token, form.salesExecutiveProfileId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createSupportTask(token, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        purpose: form.purpose.trim() || null,
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        salesSupportUserId: form.salesSupportUserId,
        priority: form.priority,
        dueDate: form.dueDate
          ? new Date(`${form.dueDate}T00:00:00.000Z`).toISOString()
          : null,
        shouldDo: shouldDo.map((s) => s.trim()).filter(Boolean),
        shouldNotDo: shouldNotDo.map((s) => s.trim()).filter(Boolean),
      });
      pushToast("Support task created", "success");
      if (returnTo) {
        router.push(returnTo);
      } else if (lockedProfileId) {
        router.push(`/profiles/${lockedProfileId}/support`);
      } else {
        router.push(`/my-tasks/${res.data.task.id}`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Create failed";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("SALES_SUPPORT_TASK_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create Sales Support tasks." />
    );
  }

  const backHref =
    returnTo ||
    (lockedProfileId
      ? `/profiles/${lockedProfileId}/support`
      : "/my-tasks");
  const backLabel = lockedProfileId
    ? `← Back to ${lockedProfileName ?? "Sales Executive"}`
    : "← Support Tasks";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          {backLabel}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New support task
        </h1>
        <p className="text-sm text-slate-600">
          Assign work to a Sales Support Executive linked to the Sales
          Executive profile.
        </p>
      </div>

      {error && <ErrorState message={error} />}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <TextInput
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <TextArea
          label="What needs to be done / purpose"
          rows={3}
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
        />
        <TextArea
          label="Additional details"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">DO</p>
            <button
              type="button"
              className="text-xs text-[var(--color-brand)] hover:underline"
              onClick={() => setShouldDo([...shouldDo, ""])}
            >
              + Add
            </button>
          </div>
          {shouldDo.map((value, index) => (
            <input
              key={index}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={value}
              onChange={(e) => {
                const next = [...shouldDo];
                next[index] = e.target.value;
                setShouldDo(next);
              }}
            />
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">DON&apos;T</p>
            <button
              type="button"
              className="text-xs text-[var(--color-brand)] hover:underline"
              onClick={() => setShouldNotDo([...shouldNotDo, ""])}
            >
              + Add
            </button>
          </div>
          {shouldNotDo.map((value, index) => (
            <input
              key={index}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={value}
              onChange={(e) => {
                const next = [...shouldNotDo];
                next[index] = e.target.value;
                setShouldNotDo(next);
              }}
            />
          ))}
        </div>
        {lockedProfileId ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Sales Executive:{" "}
            <span className="font-medium text-[var(--color-ink)]">
              {lockedProfileName ?? "Loading…"}
            </span>
          </p>
        ) : (
          <ProfileSearchSelect
            value={form.salesExecutiveProfileId}
            onChange={(id) =>
              setForm({
                ...form,
                salesExecutiveProfileId: id,
                salesSupportUserId: "",
              })
            }
          />
        )}
        <SearchableSelect
          label="Sales Support Executive"
          value={form.salesSupportUserId}
          onChange={(id) => setForm({ ...form, salesSupportUserId: id })}
          placeholder={
            form.salesExecutiveProfileId
              ? "Select support executive…"
              : "Select a profile first"
          }
          allowClear={false}
          disabled={!form.salesExecutiveProfileId}
          options={links.map((l) => ({
            value: l.salesSupportUserId,
            label: `${l.supportUser.firstName} ${l.supportUser.lastName}`,
            hint: l.supportUser.email,
          }))}
        />
        <SelectField
          label="Priority"
          value={form.priority}
          onChange={(e) =>
            setForm({
              ...form,
              priority: e.target.value as "HIGH" | "MEDIUM" | "LOW",
            })
          }
        >
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </SelectField>
        <TextInput
          label="Due date"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create task"}
        </Button>
      </form>
    </div>
  );
}

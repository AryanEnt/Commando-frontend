"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type EisenhowerCategory } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import {
  Button,
  ErrorState,
  Field,
  LoadingState,
  SelectField,
  TextArea,
  TextInput,
} from "@/components/ui";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const CATEGORIES: EisenhowerCategory[] = [
  "DO_FIRST",
  "SCHEDULE",
  "DELEGATE",
  "ELIMINATE",
];

export default function NewEisenhowerTaskPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewEisenhowerTaskForm />
    </Suspense>
  );
}

function NewEisenhowerTaskForm() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedProfileId = searchParams.get("profileId") ?? "";
  const returnTo = searchParams.get("returnTo");

  const [form, setForm] = useState({
    salesExecutiveProfileId: lockedProfileId,
    month: currentMonthValue(),
    category: "DO_FIRST" as EisenhowerCategory,
    title: "",
    notes: "",
    dueDate: "",
  });
  const [lockedProfileName, setLockedProfileName] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockedProfileId) {
      setForm((prev) => ({
        ...prev,
        salesExecutiveProfileId: lockedProfileId,
      }));
    }
  }, [lockedProfileId]);

  useEffect(() => {
    if (!token || !lockedProfileId) return;
    void api
      .getProfile(token, lockedProfileId)
      .then((res) => setLockedProfileName(res.data.profile.displayName))
      .catch(() => setLockedProfileName(null));
  }, [token, lockedProfileId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.salesExecutiveProfileId) {
      setError("Select a Sales Executive profile");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createEisenhowerTask(token, {
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        month: form.month,
        category: form.category,
        title: form.title,
        notes: form.notes.trim() || null,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : null,
      });
      pushToast("Task created", "success");
      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push(`/eisenhower/${res.data.task.id}`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("EISENHOWER_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create Eisenhower tasks." />
    );
  }

  const backHref = returnTo || "/eisenhower";
  const backLabel = lockedProfileName
    ? `← Back to ${lockedProfileName}`
    : "← Eisenhower";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-slate-600 underline">
          {backLabel}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New Eisenhower task
        </h1>
        <p className="text-sm text-slate-600">
          Creates a new monthly task record. Previous months are never
          overwritten.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        {lockedProfileId ? (
          <p className="text-sm text-slate-600">
            Sales Executive:{" "}
            <span className="font-medium text-slate-900">
              {lockedProfileName ?? "Loading…"}
            </span>
          </p>
        ) : (
          <ProfileSearchSelect
            value={form.salesExecutiveProfileId}
            onChange={(id) =>
              setForm({ ...form, salesExecutiveProfileId: id })
            }
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Month" required>
            <input
              type="month"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              required
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            />
          </Field>
          <SelectField
            label="Category"
            required
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
        </div>

        <TextInput
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

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

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Create task"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type SyncSupportLink } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  SelectField,
  TextArea,
  TextInput,
} from "@/components/ui";

export default function NewSupportTaskPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [links, setLinks] = useState<SyncSupportLink[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    salesExecutiveProfileId: "",
    salesSupportUserId: "",
    priority: "MEDIUM" as "HIGH" | "MEDIUM" | "LOW",
    dueDate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        salesSupportUserId: form.salesSupportUserId,
        priority: form.priority,
        dueDate: form.dueDate
          ? new Date(`${form.dueDate}T00:00:00.000Z`).toISOString()
          : null,
      });
      pushToast("Support task created", "success");
      router.push(`/my-tasks/${res.data.task.id}`);
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
      <ErrorState message="Only Commandos can create Sales Support tasks." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/my-tasks" className="text-sm text-slate-600 underline">
          ← Support Tasks
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
          label="Description / details"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
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

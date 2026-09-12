"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import {
  Button,
  ErrorState,
  TextArea,
  TextInput,
} from "@/components/ui";

export default function NewActionItemPage() {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    salesExecutiveProfileId: "",
    title: "",
    description: "",
    dueDate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cancelHref =
    user?.roleCode === "TEAM_LEAD"
      ? form.salesExecutiveProfileId
        ? `/profiles/${form.salesExecutiveProfileId}/actions`
        : "/profiles"
      : "/action-items";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createActionItem(token, {
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        title: form.title,
        description: form.description.trim() || null,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : null,
      });
      pushToast("Action item created", "success");
      router.push(`/action-items/${res.data.actionItem.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("ACTION_ITEM_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create action items." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={cancelHref} className="text-sm text-slate-600 underline">
          {user?.roleCode === "TEAM_LEAD"
            ? "← Sales Executive actions"
            : "← Action Items"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New action item
        </h1>
        <p className="text-sm text-slate-600">
          Creates an ACTIVE item for the selected Sales Executive profile.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <ProfileSearchSelect
          value={form.salesExecutiveProfileId}
          onChange={(id) =>
            setForm({ ...form, salesExecutiveProfileId: id })
          }
        />
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
        {error && <ErrorState message={error} />}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Create"}
        </Button>
      </form>
    </div>
  );
}

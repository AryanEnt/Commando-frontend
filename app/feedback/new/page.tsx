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
} from "@/components/ui";

export default function NewFeedbackPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    salesExecutiveProfileId: "",
    body: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createFeedback(token, {
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        body: form.body,
      });
      pushToast("Feedback saved", "success");
      router.push(`/feedback/${res.data.feedback.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("FEEDBACK_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create feedback." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/feedback" className="text-sm text-slate-600 underline">
          ← Feedback
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New feedback
        </h1>
        <p className="text-sm text-slate-600">
          Appends a new historical record. Source is set from your role (Team
          Lead or Commando).
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
        <TextArea
          label="Feedback"
          required
          rows={8}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        {error && <ErrorState message={error} />}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Create"}
        </Button>
      </form>
    </div>
  );
}

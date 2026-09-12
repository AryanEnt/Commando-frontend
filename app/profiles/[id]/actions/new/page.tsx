"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  SeContextualCreatePage,
  handleApiSubmit,
} from "@/components/SeContextualCreatePage";
import { Button, TextArea, TextInput } from "@/components/ui";

export default function ContextualActionNewPage() {
  return (
    <SeContextualCreatePage
      title="New action item"
      description="Creates an active follow-up for this Sales Executive."
      permission="ACTION_ITEM_CREATE"
      returnHref={(id) => `/profiles/${id}/actions`}
    >
      {({ profileId, submitting, setSubmitting, setError, onSuccess }) => (
        <ActionForm
          profileId={profileId}
          submitting={submitting}
          setSubmitting={setSubmitting}
          setError={setError}
          onSuccess={onSuccess}
        />
      )}
    </SeContextualCreatePage>
  );
}

function ActionForm({
  profileId,
  submitting,
  setSubmitting,
  setError,
  onSuccess,
}: {
  profileId: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  onSuccess: (href: string) => void;
}) {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createActionItem(token, {
        salesExecutiveProfileId: profileId,
        title: form.title,
        description: form.description.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      });
      onSuccess(`/profiles/${profileId}/actions`);
    } catch (err) {
      handleApiSubmit(err, setError, pushToast);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <TextInput
        label="Title"
        required
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <TextArea
        label="Description"
        rows={3}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <TextInput
        label="Due date"
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
      />
      <Button type="submit" disabled={submitting || !form.title.trim()}>
        {submitting ? "Saving…" : "Create action"}
      </Button>
    </form>
  );
}

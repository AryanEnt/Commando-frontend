"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { dueIsoFromInputs } from "@/lib/dates";
import {
  SeContextualCreatePage,
  handleApiSubmit,
} from "@/components/SeContextualCreatePage";
import { DueDateTimePicker } from "@/components/DueDateTimePicker";
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
    dueTime: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createActionItem(token, {
        salesExecutiveProfileId: profileId,
        title: form.title,
        description: form.description.trim() || null,
        dueDate: dueIsoFromInputs(form.dueDate, form.dueTime),
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
      <DueDateTimePicker
        date={form.dueDate}
        time={form.dueTime}
        disabled={submitting}
        onChange={({ date, time }) =>
          setForm((f) => ({ ...f, dueDate: date, dueTime: time }))
        }
      />
      <Button type="submit" disabled={submitting || !form.title.trim()}>
        {submitting ? "Saving…" : "Create action"}
      </Button>
    </form>
  );
}

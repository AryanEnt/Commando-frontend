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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ContextualReviewNewPage() {
  return (
    <SeContextualCreatePage
      title="New weekly review"
      description="Create a draft weekly review for this Sales Executive."
      permission="WEEKLY_REVIEW_CREATE"
      returnHref={(id) => `/profiles/${id}/reviews`}
    >
      {({ profileId, submitting, setSubmitting, setError, onSuccess }) => (
        <ReviewForm
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

function ReviewForm({
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
    weekLabel: "",
    weekStartDate: todayIsoDate(),
    meetingDate: todayIsoDate(),
    performanceSummary: "",
    whatWentWell: "",
    improvement: "",
    nextWeekAction: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createWeeklyReview(token, {
        salesExecutiveProfileId: profileId,
        ...form,
        meetingDate: new Date(form.meetingDate).toISOString(),
      });
      onSuccess(`/profiles/${profileId}/reviews`);
    } catch (err) {
      handleApiSubmit(err, setError, pushToast);
    } finally {
      setSubmitting(false);
    }
  }

  const textFields = [
    ["performanceSummary", "Performance summary"],
    ["whatWentWell", "What went well"],
    ["improvement", "Improvement"],
    ["nextWeekAction", "Next-week action"],
  ] as const;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <TextInput
        label="Week label"
        required
        value={form.weekLabel}
        onChange={(e) => setForm({ ...form, weekLabel: e.target.value })}
        placeholder="e.g. Week of Sep 8"
      />
      <TextInput
        label="Week start date"
        type="date"
        required
        value={form.weekStartDate}
        onChange={(e) => setForm({ ...form, weekStartDate: e.target.value })}
      />
      <TextInput
        label="Meeting date"
        type="date"
        required
        value={form.meetingDate}
        onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
      />
      {textFields.map(([key, label]) => (
        <TextArea
          key={key}
          label={label}
          required
          rows={3}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ))}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Create draft"}
      </Button>
    </form>
  );
}

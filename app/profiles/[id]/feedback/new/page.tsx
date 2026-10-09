"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  SeContextualCreatePage,
  handleApiSubmit,
} from "@/components/SeContextualCreatePage";
import { Button, TextArea } from "@/components/ui";

export default function ContextualFeedbackNewPage() {
  return (
    <SeContextualCreatePage
      title="New feedback"
      description="Appends a historical feedback record. Source is set from your role."
      permission="FEEDBACK_CREATE"
      returnHref={(id) => `/profiles/${id}/feedback`}
      successToast="Feedback added"
    >
      {({ profileId, submitting, setSubmitting, setError, onSuccess }) => (
        <FeedbackForm
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

function FeedbackForm({
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
  const [body, setBody] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createFeedback(token, {
        salesExecutiveProfileId: profileId,
        body,
      });
      onSuccess(`/profiles/${profileId}/feedback`);
    } catch (err) {
      handleApiSubmit(err, setError, "Unable to add feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <TextArea
        label="Feedback"
        required
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button type="submit" disabled={submitting || !body.trim()}>
        {submitting ? "Saving…" : "Save feedback"}
      </Button>
    </form>
  );
}

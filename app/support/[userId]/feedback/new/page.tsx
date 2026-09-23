"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { sseWorkspaceHref } from "@/lib/sse-workspace-nav";
import { handleApiSubmit } from "@/components/SeContextualCreatePage";
import {
  Button,
  ErrorState,
  LoadingState,
  PageHeader,
  TextArea,
} from "@/components/ui";

export default function SupportFeedbackNewPage() {
  const params = useParams<{ userId: string }>();
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = params.userId;
  const returnHref = sseWorkspaceHref(userId, "feedback");

  if (user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Super Admin is read-only for operational records." />
    );
  }
  if (!hasPermission("FEEDBACK_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create feedback." />
    );
  }
  if (!token || !userId) {
    return <LoadingState label="Loading…" />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createFeedback(token, {
        executiveUserId: userId,
        body,
      });
      pushToast("Feedback added", "success");
      router.push(returnHref);
    } catch (err) {
      handleApiSubmit(err, setError, pushToast);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Sales Support"
        title="New feedback"
        description="Appends a historical feedback record. Source is set from your role."
      />
      {error ? <ErrorState message={error} /> : null}
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
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting || !body.trim()}>
            {submitting ? "Saving…" : "Save feedback"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(returnHref)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

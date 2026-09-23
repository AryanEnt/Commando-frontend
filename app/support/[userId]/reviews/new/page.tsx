"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { sseWorkspaceHref } from "@/lib/sse-workspace-nav";
import { WeeklyReviewCreateForm } from "@/components/weekly-reviews/WeeklyReviewCreateForm";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";

export default function SupportWeeklyReviewNewPage() {
  const params = useParams<{ userId: string }>();
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const userId = params.userId;
  const returnHref = sseWorkspaceHref(userId, "reviews");

  if (user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Super Admin is read-only for weekly reviews." />
    );
  }
  if (!hasPermission("WEEKLY_REVIEW_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create weekly reviews." />
    );
  }
  if (!token || !userId) {
    return <LoadingState label="Loading…" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Sales Support"
        title="New weekly review"
        description="Record this week’s meeting notes and next actions for this Sales Support Executive."
      />
      {error ? <ErrorState message={error} /> : null}
      <WeeklyReviewCreateForm
        submitting={submitting}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setError(null);
          try {
            const res = await api.createWeeklyReview(token, {
              executiveUserId: userId,
              weekLabel: payload.weekLabel,
              weekStartDate: payload.weekStartDate,
              meetingDate: new Date(payload.meetingDate).toISOString(),
              roomName: payload.roomName,
              meetingTime: payload.meetingTime,
              meetingMinutes: payload.meetingMinutes,
              performanceSummary: payload.performanceSummary,
              whatWentWell: payload.whatWentWell,
              improvement: payload.improvement,
              nextWeekActions: payload.nextWeekActions,
            });
            pushToast("Weekly review created for Sales Support.", "success");
            router.push(
              `/weekly-reviews/${res.data.review.id}?returnTo=${encodeURIComponent(returnHref)}`,
            );
          } catch (err) {
            const msg =
              err instanceof ApiError ? err.message : "Failed to create";
            setError(msg);
            pushToast(msg, "error");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}

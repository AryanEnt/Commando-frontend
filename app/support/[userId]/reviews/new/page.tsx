"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { sseWorkspaceHref } from "@/lib/sse-workspace-nav";
import { WeeklyReviewCreateForm } from "@/components/weekly-reviews/WeeklyReviewCreateForm";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";

export default function SupportWeeklyReviewNewPage() {
  const params = useParams<{ userId: string }>();
  const { token, user, hasPermission } = useAuth();
  const router = useRouter();
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
      <WeeklyReviewCreateForm
        submitting={submitting}
        onSubmit={async (payload) => {
          setSubmitting(true);
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
            toast.success("Weekly review created");
            router.push(
              `/weekly-reviews/${res.data.review.id}?returnTo=${encodeURIComponent(returnHref)}`,
            );
          } catch (err) {
            toast.error(errorMessage(err, "Unable to create weekly review"));
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}

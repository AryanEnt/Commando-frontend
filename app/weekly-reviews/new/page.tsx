"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { WeeklyReviewCreateForm } from "@/components/weekly-reviews/WeeklyReviewCreateForm";
import { ErrorState } from "@/components/ui";

export default function NewWeeklyReviewPage() {
  const { token, user, hasPermission } = useAuth();
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cancelHref =
    user?.roleCode === "TEAM_LEAD"
      ? profileId
        ? `/profiles/${profileId}/reviews`
        : "/profiles"
      : "/weekly-reviews";

  if (user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Super Admin is read-only for weekly reviews. Commando or Team Lead create reviews for Sales Executives." />
    );
  }

  if (!hasPermission("WEEKLY_REVIEW_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create weekly reviews." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={cancelHref} className="text-sm text-slate-600 underline">
          {user?.roleCode === "TEAM_LEAD"
            ? "← Sales Executive reviews"
            : "← Weekly Reviews"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New weekly review
        </h1>
        <p className="text-sm text-slate-600">
          Review previous commitments, mark completions, then add new actions.
        </p>
      </div>

      <div className="space-y-4 rounded border border-slate-200 bg-white p-4">
        <ProfileSearchSelect
          value={profileId}
          onChange={(id) => setProfileId(id)}
        />
        {profileId ? (
          <WeeklyReviewCreateForm
            profileId={profileId}
            submitting={submitting}
            onSubmit={async (payload) => {
              if (!token) return;
              setSubmitting(true);
              try {
                const res = await api.createWeeklyReview(token, {
                  salesExecutiveProfileId: profileId,
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
                  followUpActions: payload.followUpActions,
                });
                toast.success("Weekly review created", {
                  description: "Actions are tracked for next week.",
                });
                if (user?.roleCode === "TEAM_LEAD") {
                  router.push(
                    `/weekly-reviews/${res.data.review.id}?returnTo=${encodeURIComponent(`/profiles/${profileId}/reviews`)}`,
                  );
                } else {
                  router.push(`/weekly-reviews/${res.data.review.id}`);
                }
              } catch (err) {
                toast.error(errorMessage(err, "Unable to create weekly review"));
              } finally {
                setSubmitting(false);
              }
            }}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Select a Sales Executive to continue.
          </p>
        )}
      </div>
    </div>
  );
}

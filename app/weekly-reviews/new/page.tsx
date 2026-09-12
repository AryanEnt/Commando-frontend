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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewWeeklyReviewPage() {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    salesExecutiveProfileId: "",
    weekLabel: "",
    weekStartDate: todayIsoDate(),
    meetingDate: todayIsoDate(),
    performanceSummary: "",
    whatWentWell: "",
    improvement: "",
    nextWeekAction: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cancelHref =
    user?.roleCode === "TEAM_LEAD"
      ? form.salesExecutiveProfileId
        ? `/profiles/${form.salesExecutiveProfileId}/reviews`
        : "/profiles"
      : "/weekly-reviews";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createWeeklyReview(token, {
        ...form,
        meetingDate: new Date(form.meetingDate).toISOString(),
      });
      pushToast(
        "Weekly review created — visible to the Sales Executive for signature.",
        "success",
      );
      if (user?.roleCode === "TEAM_LEAD") {
        router.push(
          `/weekly-reviews/${res.data.review.id}?returnTo=${encodeURIComponent(`/profiles/${form.salesExecutiveProfileId}/reviews`)}`,
        );
      } else {
        router.push(`/weekly-reviews/${res.data.review.id}`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

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

  const textFields = [
    ["performanceSummary", "Performance summary"],
    ["whatWentWell", "What went well"],
    ["improvement", "Improvement"],
    ["nextWeekAction", "Next-week action"],
  ] as const;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={cancelHref}
          className="text-sm text-slate-600 underline"
        >
          {user?.roleCode === "TEAM_LEAD"
            ? "← Sales Executive reviews"
            : "← Weekly Reviews"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New weekly review
        </h1>
        <p className="text-sm text-slate-600">
          The Sales Executive can open and sign it as soon as you create it.
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
          label="Week"
          required
          placeholder="e.g. 2026-W10"
          value={form.weekLabel}
          onChange={(e) => setForm({ ...form, weekLabel: e.target.value })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Week start date"
            type="date"
            required
            value={form.weekStartDate}
            onChange={(e) =>
              setForm({ ...form, weekStartDate: e.target.value })
            }
          />
          <TextInput
            label="Meeting date"
            type="date"
            required
            value={form.meetingDate}
            onChange={(e) =>
              setForm({ ...form, meetingDate: e.target.value })
            }
          />
        </div>

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

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create weekly review"}
        </Button>
      </form>
    </div>
  );
}

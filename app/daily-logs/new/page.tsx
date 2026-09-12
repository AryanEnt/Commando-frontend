"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type ActivityType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  LoadingState,
  TextArea,
  TextInput,
} from "@/components/ui";

export default function NewDailyLogPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewDailyLogForm />
    </Suspense>
  );
}

function NewDailyLogForm() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProfileId = searchParams.get("profileId") ?? "";
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [form, setForm] = useState({
    salesExecutiveProfileId: "",
    activityTypeId: "",
    sessionTitle: "",
    observation: "",
    evidence: "",
    seResponse: "",
    coachingGiven: "",
    expectedChange: "",
    followUp: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api.getActivityTypes(token).then((res) => {
      setActivityTypes(res.data.activityTypes.filter((t) => t.isActive));
    });
  }, [token]);

  useEffect(() => {
    if (!preselectedProfileId) return;
    setForm((prev) =>
      prev.salesExecutiveProfileId
        ? prev
        : { ...prev, salesExecutiveProfileId: preselectedProfileId },
    );
  }, [preselectedProfileId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createDailyLog(token, form);
      pushToast("Daily log saved", "success");
      router.push(`/daily-logs/${res.data.log.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("DAILY_LOG_CREATE")) {
    return <ErrorState message="You do not have permission to create daily logs." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={form.salesExecutiveProfileId ? `/profiles/${form.salesExecutiveProfileId}/coaching` : "/profiles"} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
          ← Back to workspace
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New daily log
        </h1>
        <p className="text-sm text-slate-600">
          Activity types are loaded from the database configuration.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        {preselectedProfileId ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Sales Executive is locked from workspace context.
          </p>
        ) : (
          <ProfileSearchSelect
            value={form.salesExecutiveProfileId}
            onChange={(id) =>
              setForm({ ...form, salesExecutiveProfileId: id })
            }
          />
        )}

        <SearchableSelect
          label="Activity type"
          value={form.activityTypeId}
          onChange={(id) => setForm({ ...form, activityTypeId: id })}
          placeholder="Select activity type…"
          allowClear={false}
          options={activityTypes.map((t) => ({
            value: t.id,
            label: t.name,
          }))}
        />

        <TextInput
          label="Session title"
          required
          value={form.sessionTitle}
          onChange={(e) =>
            setForm({ ...form, sessionTitle: e.target.value })
          }
        />

        <TextArea
          label="Observation"
          hint="What did you observe?"
          required
          rows={4}
          value={form.observation}
          onChange={(e) =>
            setForm({ ...form, observation: e.target.value })
          }
        />
        <TextArea
          label="Evidence"
          hint="What supports the observation?"
          rows={3}
          value={form.evidence}
          onChange={(e) => setForm({ ...form, evidence: e.target.value })}
        />
        <TextArea
          label="Sales Executive response"
          rows={3}
          value={form.seResponse}
          onChange={(e) => setForm({ ...form, seResponse: e.target.value })}
        />
        <TextArea
          label="Coaching given"
          rows={3}
          value={form.coachingGiven}
          onChange={(e) => setForm({ ...form, coachingGiven: e.target.value })}
        />
        <TextArea
          label="Expected change"
          rows={2}
          value={form.expectedChange}
          onChange={(e) => setForm({ ...form, expectedChange: e.target.value })}
        />
        <TextArea
          label="Follow-up"
          rows={2}
          value={form.followUp}
          onChange={(e) => setForm({ ...form, followUp: e.target.value })}
        />

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={submitting || !form.activityTypeId}>
          {submitting ? "Saving…" : "Save log"}
        </Button>
      </form>
    </div>
  );
}

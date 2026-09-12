"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, type ActivityType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  SeContextualCreatePage,
  handleApiSubmit,
} from "@/components/SeContextualCreatePage";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Button, TextArea, TextInput } from "@/components/ui";

export default function ContextualCoachingNewPage() {
  return (
    <SeContextualCreatePage
      title="New daily log"
      description="Record observation, evidence, and coaching for this Sales Executive."
      permission="DAILY_LOG_CREATE"
      returnHref={(id) => `/profiles/${id}/coaching`}
    >
      {({ profileId, submitting, setSubmitting, setError, onSuccess }) => (
        <DailyLogForm
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

function DailyLogForm({
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
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [form, setForm] = useState({
    activityTypeId: "",
    sessionTitle: "",
    observation: "",
    evidence: "",
    seResponse: "",
    coachingGiven: "",
    expectedChange: "",
    followUp: "",
  });

  useEffect(() => {
    if (!token) return;
    void api.getActivityTypes(token).then((res) => {
      setActivityTypes(res.data.activityTypes.filter((t) => t.isActive));
    });
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createDailyLog(token, {
        salesExecutiveProfileId: profileId,
        ...form,
      });
      onSuccess(`/profiles/${profileId}/coaching`);
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
        onChange={(e) => setForm({ ...form, sessionTitle: e.target.value })}
      />
      <TextArea
        label="Observation"
        required
        rows={4}
        value={form.observation}
        onChange={(e) => setForm({ ...form, observation: e.target.value })}
      />
      <TextArea
        label="Evidence"
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
      <Button type="submit" disabled={submitting || !form.activityTypeId}>
        {submitting ? "Saving…" : "Save log"}
      </Button>
    </form>
  );
}

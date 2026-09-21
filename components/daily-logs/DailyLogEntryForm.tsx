"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, type ActivityType, type DailyLogEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Button, TextArea, TextInput } from "@/components/ui";

export type EntryFormValues = {
  activityTypeId: string;
  sessionTitle: string;
  observation: string;
  evidence: string;
  seResponse: string;
  coachingGiven: string;
  expectedChange: string;
  followUp: string;
};

type OptionalKey =
  | "evidence"
  | "seResponse"
  | "coachingGiven"
  | "expectedChange"
  | "followUp"
  | "sessionTitle";

const OPTIONAL_FIELDS: {
  key: OptionalKey;
  addLabel: string;
  fieldLabel: string;
  placeholder: string;
}[] = [
  {
    key: "evidence",
    addLabel: "Add evidence",
    fieldLabel: "Evidence",
    placeholder: "What did you see or hear?",
  },
  {
    key: "seResponse",
    addLabel: "Add SE response",
    fieldLabel: "SE response",
    placeholder: "How did they respond?",
  },
  {
    key: "coachingGiven",
    addLabel: "Add coaching",
    fieldLabel: "Coaching",
    placeholder: "What coaching did you give?",
  },
  {
    key: "expectedChange",
    addLabel: "Add expected change",
    fieldLabel: "Expected change",
    placeholder: "What should change next?",
  },
  {
    key: "followUp",
    addLabel: "Add follow-up",
    fieldLabel: "Follow-up",
    placeholder: "Any follow-up needed?",
  },
];

const emptyForm = (): EntryFormValues => ({
  activityTypeId: "",
  sessionTitle: "",
  observation: "",
  evidence: "",
  seResponse: "",
  coachingGiven: "",
  expectedChange: "",
  followUp: "",
});

function deriveTitle(
  sessionTitle: string,
  observation: string,
  activityName: string,
): string {
  const explicit = sessionTitle.trim();
  if (explicit) return explicit.slice(0, 200);
  const firstLine = observation
    .trim()
    .split(/\n/)[0]
    ?.trim()
    .slice(0, 80);
  if (firstLine) return firstLine;
  return activityName || "Activity";
}

export function DailyLogEntryForm({
  initial,
  submitting,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: DailyLogEntry | null;
  submitting: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: EntryFormValues) => void | Promise<void>;
}) {
  const { token } = useAuth();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [form, setForm] = useState<EntryFormValues>(() =>
    initial
      ? {
          activityTypeId: initial.activityTypeId,
          sessionTitle: initial.sessionTitle,
          observation: initial.observation,
          evidence: initial.evidence ?? "",
          seResponse: initial.seResponse ?? "",
          coachingGiven: initial.coachingGiven ?? "",
          expectedChange: initial.expectedChange ?? "",
          followUp: initial.followUp ?? "",
        }
      : emptyForm(),
  );
  const [open, setOpen] = useState<Record<OptionalKey, boolean>>(() => ({
    evidence: Boolean(initial?.evidence?.trim()),
    seResponse: Boolean(initial?.seResponse?.trim()),
    coachingGiven: Boolean(initial?.coachingGiven?.trim()),
    expectedChange: Boolean(initial?.expectedChange?.trim()),
    followUp: Boolean(initial?.followUp?.trim()),
    sessionTitle: Boolean(initial?.sessionTitle?.trim()),
  }));
  const [showTitle, setShowTitle] = useState(
    Boolean(initial?.sessionTitle?.trim()),
  );

  useEffect(() => {
    if (!token) return;
    void api.getActivityTypes(token).then((res) => {
      const active = res.data.activityTypes.filter((t) => t.isActive);
      setActivityTypes(active);
      setForm((prev) => {
        if (prev.activityTypeId || !active[0]) return prev;
        return { ...prev, activityTypeId: active[0].id };
      });
    });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const typeName =
      activityTypes.find((t) => t.id === form.activityTypeId)?.name ?? "";
    await onSubmit({
      ...form,
      sessionTitle: deriveTitle(form.sessionTitle, form.observation, typeName),
    });
  }

  const canSubmit =
    Boolean(form.activityTypeId) &&
    form.observation.trim().length > 0 &&
    !submitting;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-brand-ring)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
      aria-label={initial ? "Edit activity" : "Add activity"}
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

      <TextArea
        label="What happened?"
        required
        rows={3}
        value={form.observation}
        onChange={(e) => setForm({ ...form, observation: e.target.value })}
        placeholder="Start typing your observation…"
      />

      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {OPTIONAL_FIELDS.map((field) =>
          open[field.key] ? null : (
            <button
              key={field.key}
              type="button"
              className="text-[13px] font-medium text-[var(--color-brand)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              onClick={() => setOpen({ ...open, [field.key]: true })}
            >
              + {field.addLabel}
            </button>
          ),
        )}
        {!showTitle ? (
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            onClick={() => setShowTitle(true)}
          >
            + Add a short title
          </button>
        ) : null}
      </div>

      {OPTIONAL_FIELDS.map((field) =>
        open[field.key] ? (
          <div key={field.key} className="relative">
            <button
              type="button"
              className="absolute right-0 top-0 z-10 text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--status-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              aria-label={`Remove ${field.fieldLabel.toLowerCase()}`}
              onClick={() => {
                setOpen({ ...open, [field.key]: false });
                setForm({ ...form, [field.key]: "" });
              }}
            >
              − Remove
            </button>
            <TextArea
              label={field.fieldLabel}
              rows={2}
              value={form[field.key]}
              onChange={(e) =>
                setForm({ ...form, [field.key]: e.target.value })
              }
              placeholder={field.placeholder}
            />
          </div>
        ) : null,
      )}

      {showTitle ? (
        <div className="relative">
          <button
            type="button"
            className="absolute right-0 top-0 z-10 text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--status-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            aria-label="Remove short title"
            onClick={() => {
              setShowTitle(false);
              setForm({ ...form, sessionTitle: "" });
            }}
          >
            − Remove
          </button>
          <TextInput
            label="Short title"
            value={form.sessionTitle}
            onChange={(e) => setForm({ ...form, sessionTitle: e.target.value })}
            placeholder="Optional — defaults from observation"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

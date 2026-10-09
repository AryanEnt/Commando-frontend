"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  api,
  type ActivityType,
  type DailyLogAttachmentUpload,
  type DailyLogEntry,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Button, TextArea, TextInput } from "@/components/ui";
import {
  DAILY_LOG_IMAGE_ACCEPT,
  MAX_DAILY_LOG_SCREENSHOTS,
  uploadDailyLogImage,
} from "@/components/daily-logs/DailyLogScreenshots";

export type EntryFormValues = {
  activityTypeId: string;
  sessionTitle: string;
  observation: string;
  evidence: string;
  seResponse: string;
  coachingGiven: string;
  expectedChange: string;
  followUp: string;
  /** New screenshots uploaded in this form (optional). */
  attachments: DailyLogAttachmentUpload[];
};

type PendingScreenshot = DailyLogAttachmentUpload & { previewUrl: string };

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

const emptyForm = (): Omit<EntryFormValues, "attachments"> => ({
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingScreenshot[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const existingScreenshotCount = initial?.attachments?.length ?? 0;
  const screenshotSlotsLeft =
    MAX_DAILY_LOG_SCREENSHOTS - existingScreenshotCount - pending.length;

  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    },
    [],
  );

  async function addScreenshots(files: FileList | null) {
    if (!token || !files || files.length === 0) return;
    setUploadError(null);
    const picked = Array.from(files).slice(0, Math.max(0, screenshotSlotsLeft));
    if (picked.length < files.length) {
      setUploadError(
        `An activity can have at most ${MAX_DAILY_LOG_SCREENSHOTS} screenshots.`,
      );
    }
    setUploading(true);
    try {
      for (const file of picked) {
        const uploaded = await uploadDailyLogImage(token, file);
        setPending((prev) => [
          ...prev,
          { ...uploaded, previewUrl: URL.createObjectURL(file) },
        ]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePending(key: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  const [form, setForm] = useState<Omit<EntryFormValues, "attachments">>(() =>
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
      attachments: pending.map((p) => ({
        key: p.key,
        fileName: p.fileName,
        contentType: p.contentType,
        size: p.size,
      })),
    });
  }

  const selectedTypeDescription =
    activityTypes.find((t) => t.id === form.activityTypeId)?.description?.trim() ?? "";

  const canSubmit =
    Boolean(form.activityTypeId) &&
    form.observation.trim().length > 0 &&
    !submitting &&
    !uploading;

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
          hint: t.description?.trim() || undefined,
        }))}
      />
      {selectedTypeDescription ? (
        <p className="-mt-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
          {selectedTypeDescription}
        </p>
      ) : null}

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
        {pending.length === 0 && screenshotSlotsLeft > 0 ? (
          <button
            type="button"
            disabled={uploading}
            className="text-[13px] font-medium text-[var(--color-brand)] hover:underline disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "+ Add screenshot"}
          </button>
        ) : null}
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

      <input
        ref={fileInputRef}
        type="file"
        accept={DAILY_LOG_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void addScreenshots(e.target.files)}
      />

      {pending.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">
            Screenshots{" "}
            <span className="text-[12px] font-normal text-[var(--color-ink-subtle)]">
              (optional)
            </span>
          </p>
          <ul className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {pending.map((p) => (
              <li
                key={p.key}
                className="group relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt={p.fileName}
                  className="h-20 w-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${p.fileName}`}
                  onClick={() => removePending(p.key)}
                  className="absolute right-1 top-1 rounded-full bg-[var(--color-surface)]/90 p-0.5 text-[var(--color-ink-muted)] shadow-[var(--shadow-sm)] hover:text-[var(--status-danger)]"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
            {screenshotSlotsLeft > 0 ? (
              <li>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line-strong)] text-[11px] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
                >
                  <ImagePlus size={14} />
                  {uploading ? "Uploading…" : "Add"}
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {uploadError ? (
        <p className="text-[13px] text-[var(--status-danger)]" role="alert">
          {uploadError}
        </p>
      ) : null}

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

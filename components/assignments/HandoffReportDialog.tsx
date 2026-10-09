"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Lock, Paperclip } from "lucide-react";
import {
  api,
  errorMessage,
  type Assignment,
  type EndAssignmentBody,
  type HandoffRequirements,
  type HandoffSubject,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatAmount,
  performanceLevel,
  roleLabelFor,
  sanitizeAmountInput,
} from "@/lib/performance-snapshot";
import {
  EvidenceUploader,
  type EvidenceFile,
} from "@/components/referrals/PerformanceSnapshot";
import { Button, Drawer, LoadingState, TextArea, TextInput } from "@/components/ui";

export const HANDOFF_DESCRIPTION_MIN = 20;

type Draft = {
  description: string;
  salesAchieved: string;
  salesTarget: string;
  files: EvidenceFile[];
  showFiles: boolean;
};

const emptyDraft = (): Draft => ({
  description: "",
  salesAchieved: "",
  salesTarget: "",
  files: [],
  showFiles: false,
});

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isReady(draft: Draft | undefined) {
  return (draft?.description.trim().length ?? 0) >= HANDOFF_DESCRIPTION_MIN;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function periodText(period: HandoffRequirements["period"]) {
  const days = Math.max(
    1,
    Math.ceil((new Date(period.end).getTime() - new Date(period.start).getTime()) / 86_400_000),
  );
  return `${formatDate(period.start)} – today · ${days} day${days === 1 ? "" : "s"}`;
}

function startingLine(snap: NonNullable<HandoffSubject["startingSnapshot"]>) {
  const parts: string[] = [];
  if (snap.salesAchieved != null && snap.salesTarget != null) {
    parts.push(`Sales ${formatAmount(snap.salesAchieved)} of ${formatAmount(snap.salesTarget)}`);
  } else if (snap.salesAchieved != null) {
    parts.push(`Sales ${formatAmount(snap.salesAchieved)}`);
  }
  if (snap.achievementPct != null) parts.push(`${formatAmount(snap.achievementPct)}% of target`);
  parts.push(performanceLevel(snap.overallPerformance).label);
  return parts.join(" · ");
}

function SubjectCard({
  subject,
  period,
  draft,
  onChange,
  onUploadingChange,
  showMissing,
}: {
  subject: HandoffSubject;
  period: HandoffRequirements["period"];
  draft: Draft;
  onChange: (updater: (prev: Draft) => Draft) => void;
  onUploadingChange: (userId: string, uploading: boolean) => void;
  showMissing: boolean;
}) {
  const ready = isReady(draft);
  const length = draft.description.trim().length;
  const firstName = subject.name.split(/\s+/)[0] || subject.name;
  const sales = parseAmount(draft.salesAchieved);
  const target = parseAmount(draft.salesTarget);
  const pct = sales != null && target ? Math.round((sales / target) * 10000) / 100 : null;
  const handleUploading = useCallback(
    (uploading: boolean) => onUploadingChange(subject.userId, uploading),
    [onUploadingChange, subject.userId],
  );

  return (
    <article
      className={`snap-card${ready ? " is-complete" : ""}`}
      aria-label={`${subject.name} handoff report`}
    >
      <header className="snap-card-head">
        <div className="min-w-0 flex-1">
          <p className="snap-name">{subject.name}</p>
          <p className="snap-role">
            {roleLabelFor(subject.role)} · {periodText(period)}
          </p>
        </div>
        <span className={`snap-status${ready ? " is-complete" : ""}`} role="status">
          {ready ? (
            <>
              <Check size={13} strokeWidth={2.6} aria-hidden /> Ready
            </>
          ) : (
            "Required"
          )}
        </span>
      </header>

      {subject.startingSnapshot ? (
        <p className="m-0 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-ink-muted)]">
          <span className="font-semibold text-[var(--color-ink)]">When you took over: </span>
          {startingLine(subject.startingSnapshot)}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <TextInput
          label="Sales achieved (optional)"
          inputMode="decimal"
          placeholder="85,000"
          value={draft.salesAchieved}
          onChange={(e) => {
            const salesAchieved = sanitizeAmountInput(e.target.value);
            onChange((d) => ({ ...d, salesAchieved }));
          }}
        />
        <TextInput
          label="Target (optional)"
          inputMode="decimal"
          placeholder="100,000"
          value={draft.salesTarget}
          onChange={(e) => {
            const salesTarget = sanitizeAmountInput(e.target.value);
            onChange((d) => ({ ...d, salesTarget }));
          }}
        />
        <p className="m-0 h-10 content-center text-sm font-semibold tabular-nums" aria-live="polite">
          {pct != null ? `${formatAmount(pct)}%` : ""}
        </p>
      </div>

      <div>
        <TextArea
          label={`How did ${firstName} perform?`}
          hint="Based on sales over this period: what improved, what still needs work, what the Team Lead should watch."
          placeholder="e.g. Sales moved from 60% to 85% of target. Follow-ups are now consistent; closing on large deals still needs support."
          required
          rows={4}
          maxLength={5000}
          data-handoff-description={subject.userId}
          error={
            showMissing && !ready
              ? `Write at least ${HANDOFF_DESCRIPTION_MIN} characters (${length} so far)`
              : undefined
          }
          value={draft.description}
          onChange={(e) => {
            const description = e.target.value;
            onChange((d) => ({ ...d, description }));
          }}
        />
        {!ready && !showMissing ? (
          <p className="m-0 mt-1 text-xs text-[var(--color-ink-muted)]">
            {length}/{HANDOFF_DESCRIPTION_MIN} characters minimum
          </p>
        ) : null}
      </div>

      {draft.showFiles ? (
        <EvidenceUploader
          files={draft.files}
          onChange={(updater) => onChange((d) => ({ ...d, files: updater(d.files) }))}
          purpose="handoff-report"
          title="Documents"
          hint="A sales sheet or report that backs up your description."
          maxFiles={5}
          onUploadingChange={handleUploading}
        />
      ) : (
        <button
          type="button"
          className="snap-link inline-flex items-center gap-1 justify-self-start text-sm"
          onClick={() => onChange((d) => ({ ...d, showFiles: true }))}
        >
          <Paperclip size={14} strokeWidth={2.2} aria-hidden /> Attach a document (optional)
        </button>
      )}
    </article>
  );
}

/**
 * Collects the Commando's handoff report (SE + each linked SSE) and ends the
 * assignment. Completion stays disabled until every description is written.
 */
export function HandoffReportDialog({
  open,
  assignmentId,
  profileName,
  endInput,
  onCancel,
  onCompleted,
}: {
  open: boolean;
  assignmentId: string | null;
  profileName: string;
  endInput: Omit<EndAssignmentBody, "handoffReports">;
  onCancel: () => void;
  onCompleted: (assignment: Assignment) => void | Promise<void>;
}) {
  const { token } = useAuth();
  const [requirements, setRequirements] = useState<HandoffRequirements | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  // The access token rotates every few minutes; that must not wipe a half-written report.
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const loadRequirements = useCallback(async () => {
    const access = tokenRef.current;
    if (!access || !assignmentId) return;
    setLoadError(null);
    try {
      const res = await api.getHandoffRequirements(access, assignmentId);
      setRequirements(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, "Couldn't load who needs a handoff report"));
    }
  }, [assignmentId]);

  useEffect(() => {
    if (!open) return;
    setRequirements(null);
    setDrafts({});
    setUploading({});
    setSubmitError(null);
    setShowMissing(false);
    void loadRequirements();
  }, [open, loadRequirements]);

  const onUploadingChange = useCallback((userId: string, value: boolean) => {
    setUploading((prev) => (prev[userId] === value ? prev : { ...prev, [userId]: value }));
  }, []);

  const subjects = requirements?.subjects ?? [];
  const missing = subjects.filter((s) => !isReady(drafts[s.userId]));
  const readyCount = subjects.length - missing.length;
  const anyUploading = Object.values(uploading).some(Boolean);

  function onCompleteClick() {
    const first = missing[0];
    if (!first) {
      void submit();
      return;
    }
    setShowMissing(true);
    const field = document.querySelector<HTMLTextAreaElement>(
      `[data-handoff-description="${first.userId}"]`,
    );
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }

  async function submit() {
    const access = tokenRef.current;
    if (!access || !assignmentId || missing.length > 0 || anyUploading || busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await api.endAssignment(access, assignmentId, {
        ...endInput,
        handoffReports: subjects.map((s) => {
          const d = drafts[s.userId] ?? emptyDraft();
          return {
            subjectUserId: s.userId,
            description: d.description.trim(),
            salesAchieved: parseAmount(d.salesAchieved),
            salesTarget: parseAmount(d.salesTarget),
            attachments: d.files.map(({ key, fileName, contentType, size }) => ({
              key,
              fileName,
              contentType,
              size,
            })),
          };
        }),
      });
      await onCompleted(res.data.assignment);
    } catch (err) {
      setSubmitError(errorMessage(err, "Unable to complete the intervention"));
      // Linked Sales Support may have changed while the form was open.
      void loadRequirements();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      size="lg"
      title={`Hand ${profileName} back to the Team Lead`}
      description="Write a short performance report for each person before completing the intervention."
      onClose={() => {
        if (!busy) onCancel();
      }}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className={`m-0 text-sm ${
              showMissing && missing.length > 0
                ? "text-[var(--status-danger)]"
                : "text-[var(--color-ink-muted)]"
            }`}
            role="status"
          >
            {anyUploading
              ? "Waiting for documents to finish uploading…"
              : missing.length > 0
                ? `Still needed: description for ${missing.map((s) => s.name).join(", ")}`
                : subjects.length > 0
                  ? `${readyCount} of ${subjects.length} report${subjects.length === 1 ? "" : "s"} ready`
                  : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={onCompleteClick}
              disabled={!requirements || anyUploading || busy}
            >
              {busy ? "Completing…" : "Complete intervention"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="m-0 flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
          <Lock size={13} strokeWidth={2.2} aria-hidden />
          Only the Team Lead and Admin can see this report.
        </p>

        {loadError ? (
          <div className="space-y-2">
            <p className="m-0 text-sm text-[var(--status-danger)]" role="alert">
              {loadError}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void loadRequirements()}>
              Try again
            </Button>
          </div>
        ) : !requirements ? (
          <LoadingState label="Loading…" />
        ) : (
          subjects.map((s) => (
            <SubjectCard
              key={s.userId}
              subject={s}
              period={requirements.period}
              draft={drafts[s.userId] ?? emptyDraft()}
              onChange={(updater) =>
                setDrafts((prev) => ({
                  ...prev,
                  [s.userId]: updater(prev[s.userId] ?? emptyDraft()),
                }))
              }
              onUploadingChange={onUploadingChange}
              showMissing={showMissing}
            />
          ))
        )}

        {submitError ? (
          <p className="m-0 text-sm text-[var(--status-danger)]" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}

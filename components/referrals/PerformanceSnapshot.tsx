"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  CalendarRange,
  Check,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  MoveRight,
  Paperclip,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import {
  api,
  errorMessage,
  type PerformanceSnapshot,
  type SnapshotEvidence,
  type SnapshotEvidenceUpload,
  type SnapshotPeriod,
  type SnapshotSubjectRole,
  type SnapshotTrend,
  type UploadPurpose,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  EVIDENCE_ACCEPT,
  MAX_EVIDENCE_BYTES,
  MAX_EVIDENCE_FILES,
  PERFORMANCE_LEVELS,
  TRENDS,
  draftAchievement,
  evidenceContentType,
  evidenceKind,
  formatAmount,
  formatBytes,
  insightOption,
  insightsFor,
  isAchievementComputed,
  performanceLevel,
  periodHeadline,
  periodLabel,
  roleLabelFor,
  sanitizeAmountInput,
  snapshotFieldId,
  snapshotMissingParts,
  summaryFromSnapshot,
  trendOption,
  type SnapshotDraft,
  type SnapshotPart,
  type SnapshotSummary,
} from "@/lib/performance-snapshot";
import { TextArea, TextInput } from "@/components/ui";

export type SnapshotCardSubject = {
  userId: string;
  name: string;
  role: SnapshotSubjectRole;
  period: SnapshotPeriod | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function TrendIcon({ trend, size = 15 }: { trend: SnapshotTrend; size?: number }) {
  const Icon =
    trend === "IMPROVING" ? TrendingUp : trend === "DECLINING" ? TrendingDown : MoveRight;
  return <Icon size={size} strokeWidth={2.2} aria-hidden />;
}

function PeriodChip({ period }: { period: SnapshotPeriod | null }) {
  return (
    <span className="snap-period" title="Performance period">
      <CalendarRange size={13} strokeWidth={2} aria-hidden />
      <span>
        <span className="snap-period-label">Performance period</span>
        {periodLabel(period)}
      </span>
    </span>
  );
}

function RequiredMark() {
  return (
    <span className="text-[var(--status-danger)]" aria-hidden>
      {" "}
      *
    </span>
  );
}

function SnapFieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="m-0 mt-1.5 text-xs text-[var(--status-danger)]" role="alert">
      {children}
    </p>
  );
}

function SnapSegmented<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  renderIcon,
  error,
}: {
  id: string;
  label: string;
  value: T | null;
  options: Array<{ value: T; label: string; tone: string }>;
  onChange: (value: T) => void;
  renderIcon?: (value: T) => ReactNode;
  error?: string;
}) {
  const labelId = useId();
  const errorId = `${id}-error`;
  return (
    <div className="snap-field" id={id}>
      <p className="snap-field-label" id={labelId}>
        {label}
        <RequiredMark />
      </p>
      <div
        className="snap-segmented"
        role="radiogroup"
        aria-labelledby={labelId}
        aria-required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-tone={o.tone}
              className={`snap-segment${selected ? " is-selected" : ""}`}
              onClick={() => onChange(o.value)}
            >
              {renderIcon ? renderIcon(o.value) : <span className="snap-dot" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
      {error ? <SnapFieldError id={errorId}>{error}</SnapFieldError> : null}
    </div>
  );
}

/** One person's snapshot: performance, trend, quick insights, optional numbers, TL's note. */
export function SnapshotSubjectCard({
  subject,
  draft,
  onChange,
  showErrors = false,
}: {
  subject: SnapshotCardSubject;
  draft: SnapshotDraft;
  onChange: (next: SnapshotDraft) => void;
  /** After the user tries to continue, explain each empty required field inline. */
  showErrors?: boolean;
}) {
  const isSe = subject.role === "SALES_EXECUTIVE";
  const missingParts = snapshotMissingParts(draft);
  const missing = missingParts.map((m) => m.part);
  const complete = missing.length === 0;
  const fieldId = (part: SnapshotPart) => snapshotFieldId(subject.userId, part);
  const errorFor = (part: SnapshotPart, message: string) =>
    showErrors && missing.includes(part) ? message : undefined;
  const insightError = errorFor("insight", "Pick at least one option.");
  const achievement = draftAchievement(draft);
  const computed = isAchievementComputed(draft);
  const patch = (p: Partial<SnapshotDraft>) => onChange({ ...draft, ...p });

  function toggleInsight(key: string) {
    patch({
      insights: draft.insights.includes(key)
        ? draft.insights.filter((k) => k !== key)
        : [...draft.insights, key],
    });
  }

  return (
    <article className={`snap-card${complete ? " is-complete" : ""}`} aria-label={`${subject.name} snapshot`}>
      <header className="snap-card-head">
        <span className="snap-avatar" aria-hidden>
          {initials(subject.name) || "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="snap-name">{subject.name}</p>
          <p className="snap-role">{roleLabelFor(subject.role)}</p>
        </div>
        <PeriodChip period={subject.period} />
        <span className={`snap-status${complete ? " is-complete" : ""}`} role="status">
          {complete ? (
            <>
              <Check size={13} strokeWidth={2.6} aria-hidden /> Ready
            </>
          ) : (
            `${missing.length} required left`
          )}
        </span>
      </header>

      <div className="snap-row">
        <SnapSegmented
          id={fieldId("performance")}
          label={isSe ? "Overall performance" : "Performance"}
          value={draft.overallPerformance}
          options={PERFORMANCE_LEVELS}
          onChange={(overallPerformance) => patch({ overallPerformance })}
          error={errorFor("performance", "Choose a performance level.")}
        />
        <SnapSegmented
          id={fieldId("trend")}
          label="Trend"
          value={draft.trend}
          options={TRENDS}
          onChange={(trend) => patch({ trend })}
          renderIcon={(t) => <TrendIcon trend={t} size={14} />}
          error={errorFor("trend", "Choose a trend.")}
        />
      </div>

      <div className="snap-field" id={fieldId("insight")}>
        <p className="snap-field-label">
          What&apos;s happening?
          <RequiredMark /> <span className="snap-field-hint">Pick all that apply</span>
        </p>
        <div
          className="snap-chips"
          role="group"
          aria-describedby={insightError ? `${fieldId("insight")}-error` : undefined}
        >
          {insightsFor(subject.role).map((o) => {
            const selected = draft.insights.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={selected}
                className={`snap-chip${selected ? " is-selected" : ""}`}
                onClick={() => toggleInsight(o.key)}
              >
                <span aria-hidden>{o.emoji}</span>
                {o.label}
                {selected ? <Check size={12} strokeWidth={2.6} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        {insightError ? (
          <SnapFieldError id={`${fieldId("insight")}-error`}>{insightError}</SnapFieldError>
        ) : null}
      </div>

      {isSe ? (
        <div className="snap-field">
          <p className="snap-field-label">
            Sales numbers <span className="snap-optional">Optional</span>
          </p>
          <div className="snap-numbers">
            <TextInput
              label="Sales achieved"
              inputMode="decimal"
              placeholder="84,200"
              value={draft.salesAchieved}
              onChange={(e) => patch({ salesAchieved: sanitizeAmountInput(e.target.value) })}
            />
            <TextInput
              label="Target"
              inputMode="decimal"
              placeholder="100,000"
              value={draft.salesTarget}
              onChange={(e) => patch({ salesTarget: sanitizeAmountInput(e.target.value) })}
            />
            {computed ? (
              <div className="snap-achievement" aria-live="polite">
                <span className="snap-field-label">Achievement</span>
                <strong>{formatAmount(achievement ?? 0)}%</strong>
              </div>
            ) : (
              <TextInput
                label="Achievement %"
                inputMode="decimal"
                placeholder="84"
                value={draft.achievementPct}
                onChange={(e) => patch({ achievementPct: sanitizeAmountInput(e.target.value) })}
              />
            )}
          </div>
        </div>
      ) : null}

      <TextArea
        id={fieldId("note")}
        label="TL's Note"
        required
        error={errorFor("note", "Add a short note for the Commando.")}
        hint={
          isSe
            ? "What's the main thing the Commando should know about this employee?"
            : "What should the Commando know about this Sales Support Executive?"
        }
        placeholder="Briefly explain the employee's recent performance, key concerns, achievements, or why this intervention is needed..."
        rows={3}
        maxLength={2000}
        value={draft.note}
        onChange={(e) => patch({ note: e.target.value })}
      />
    </article>
  );
}

export type EvidenceFile = SnapshotEvidenceUpload & { id: string };

function EvidenceIcon({ fileName }: { fileName: string }) {
  const kind = evidenceKind(fileName);
  const Icon = kind === "sheet" ? FileSpreadsheet : kind === "image" ? FileImage : FileText;
  return <Icon size={16} strokeWidth={2} aria-hidden className="snap-file-icon" data-kind={kind} />;
}

/** Compact, optional drag-and-drop / browse upload with file cards. */
export function EvidenceUploader({
  files,
  onChange,
  purpose = "intervention-evidence",
  title = "Supporting Evidence",
  hint = "Have a report that helps explain the situation? Add it here.",
  maxFiles = MAX_EVIDENCE_FILES,
  onUploadingChange,
}: {
  files: EvidenceFile[];
  onChange: (updater: (prev: EvidenceFile[]) => EvidenceFile[]) => void;
  purpose?: UploadPurpose;
  title?: string;
  hint?: string;
  maxFiles?: number;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isUploading = uploading.length > 0;

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  async function addFiles(list: FileList | File[]) {
    setError(null);
    const picked = [...list].slice(0, Math.max(0, maxFiles - files.length));
    if (list.length > picked.length) {
      setError(`Up to ${maxFiles} documents.`);
    }
    for (const file of picked) {
      const contentType = evidenceContentType(file.name);
      if (!contentType) {
        setError(`${file.name}: use PDF, Excel, CSV, Word, JPG, or PNG.`);
        continue;
      }
      if (file.size > MAX_EVIDENCE_BYTES) {
        setError(`${file.name} is larger than 10 MB.`);
        continue;
      }
      setUploading((u) => [...u, file.name]);
      try {
        const res = await api.uploadObject(token ?? "", {
          purpose,
          fileName: file.name,
          contentType,
          file,
        });
        onChange((prev) => [
          ...prev,
          {
            id: res.data.key,
            key: res.data.key,
            fileName: res.data.fileName,
            contentType: res.data.contentType,
            size: res.data.size,
          },
        ]);
      } catch (err) {
        setError(errorMessage(err, `Couldn't upload ${file.name}`));
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name));
      }
    }
  }

  return (
    <section className="snap-evidence" aria-label={title}>
      <div className="snap-evidence-head">
        <p className="snap-evidence-title">
          <Paperclip size={14} strokeWidth={2.2} aria-hidden /> {title}
          <span className="snap-optional">Optional</span>
        </p>
        <p className="snap-field-hint">{hint}</p>
      </div>
      <div
        className={`snap-drop${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud size={18} strokeWidth={2} aria-hidden />
        <span>
          Drop files here or{" "}
          <button type="button" className="snap-link" onClick={() => inputRef.current?.click()}>
            browse
          </button>
        </span>
        <span className="snap-drop-types">PDF, XLSX, XLS, CSV, DOCX, DOC, JPG, PNG · 10 MB each</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={EVIDENCE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p className="m-0 text-xs text-[var(--status-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {files.length > 0 || uploading.length > 0 ? (
        <ul className="snap-files">
          {files.map((f) => (
            <li key={f.id} className="snap-file">
              <EvidenceIcon fileName={f.fileName} />
              <span className="snap-file-name">{f.fileName}</span>
              <span className="snap-file-size">{formatBytes(f.size)}</span>
              <button
                type="button"
                className="snap-file-remove"
                aria-label={`Remove ${f.fileName}`}
                onClick={() => onChange((prev) => prev.filter((x) => x.id !== f.id))}
              >
                <X size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </li>
          ))}
          {uploading.map((name) => (
            <li key={`up-${name}`} className="snap-file is-uploading" aria-live="polite">
              <EvidenceIcon fileName={name} />
              <span className="snap-file-name">{name}</span>
              <span className="snap-file-size">Uploading…</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Compact read-only briefing of one person's snapshot. */
export function SnapshotSummaryCard({ summary }: { summary: SnapshotSummary }) {
  const level = summary.overallPerformance ? performanceLevel(summary.overallPerformance) : null;
  const trend = summary.trend ? trendOption(summary.trend) : null;
  const hasNumbers =
    summary.salesAchieved != null || summary.salesTarget != null || summary.achievementPct != null;
  return (
    <article className="snap-summary" aria-label={`${summary.name} snapshot`}>
      <header className="snap-card-head">
        <span className="snap-avatar" aria-hidden>
          {initials(summary.name) || "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="snap-name">{summary.name}</p>
          <p className="snap-role">{roleLabelFor(summary.role)}</p>
        </div>
        <PeriodChip period={summary.period} />
      </header>
      {level || trend ? (
        <div className="snap-ratings">
          {level ? (
            <div className="snap-rating">
              <p className="snap-field-label">
                {summary.role === "SALES_SUPPORT_EXECUTIVE" ? "Performance" : "Overall performance"}
              </p>
              <span className="snap-badge" data-tone={level.tone}>
                <span className="snap-dot" aria-hidden /> {level.label}
              </span>
              <p className="snap-rating-meaning">{level.meaning}</p>
            </div>
          ) : null}
          {trend ? (
            <div className="snap-rating">
              <p className="snap-field-label">Trend</p>
              <span className="snap-badge" data-tone={trend.tone}>
                <TrendIcon trend={trend.value} size={13} /> {trend.label}
              </span>
              <p className="snap-rating-meaning">{trend.meaning}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {hasNumbers ? (
        <dl className="snap-metrics">
          {summary.salesAchieved != null ? (
            <div>
              <dt>Sales</dt>
              <dd>{formatAmount(summary.salesAchieved)}</dd>
            </div>
          ) : null}
          {summary.salesTarget != null ? (
            <div>
              <dt>Target</dt>
              <dd>{formatAmount(summary.salesTarget)}</dd>
            </div>
          ) : null}
          {summary.achievementPct != null ? (
            <div>
              <dt>Achievement</dt>
              <dd>{formatAmount(summary.achievementPct)}%</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {summary.insights.length > 0 ? (
        <div className="snap-field">
          <p className="snap-field-label">Key insights</p>
          <ul className="snap-insight-list">
            {summary.insights.map((key) => {
              const o = insightOption(key);
              return (
                <li key={key}>
                  <span aria-hidden>{o.emoji}</span> {o.label}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {summary.note ? (
        <div className="snap-field">
          <p className="snap-field-label">TL&apos;s Note</p>
          <blockquote className="snap-quote">{summary.note}</blockquote>
        </div>
      ) : null}
    </article>
  );
}

export function EvidenceList({
  files,
  onOpen,
}: {
  files: Array<{ id: string; fileName: string; size: number | null }>;
  onOpen?: (id: string) => void;
}) {
  if (files.length === 0) return null;
  return (
    <div className="snap-field">
      <p className="snap-field-label">Supporting evidence</p>
      <ul className="snap-files">
        {files.map((f) => (
          <li key={f.id} className="snap-file">
            <EvidenceIcon fileName={f.fileName} />
            <span className="snap-file-name">{f.fileName}</span>
            <span className="snap-file-size">{formatBytes(f.size)}</span>
            {onOpen ? (
              <button
                type="button"
                className="snap-file-remove"
                aria-label={`Download ${f.fileName}`}
                onClick={() => onOpen(f.id)}
              >
                <Download size={14} strokeWidth={2.2} aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Commando / Team Lead read-only view of the snapshot sent with the approval. */
export function PerformanceSnapshotReadonly({
  referralId,
  snapshots,
  evidence,
}: {
  referralId: string;
  snapshots: PerformanceSnapshot[];
  evidence: SnapshotEvidence[];
}) {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const author = snapshots[0]?.createdBy;

  async function open(id: string) {
    setError(null);
    try {
      const res = await api.getSnapshotEvidenceUrl(token ?? "", referralId, id);
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(errorMessage(err, "Couldn't open this document"));
    }
  }

  return (
    <section className="surface space-y-4 p-4 sm:p-5" aria-labelledby="snapshot-readonly-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="snapshot-readonly-title" className="text-base font-semibold tracking-tight">
            Performance Snapshot
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
            {author ? `From ${author.firstName} ${author.lastName} (Team Lead)` : "From the Team Lead"} ·{" "}
            {periodHeadline(snapshots[0]?.period)}
          </p>
        </div>
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]">
          Read-only
        </span>
      </div>
      <div className="snap-summary-grid">
        {snapshots.map((s) => (
          <SnapshotSummaryCard key={s.id} summary={summaryFromSnapshot(s)} />
        ))}
      </div>
      <EvidenceList
        files={evidence.map((e) => ({ id: e.id, fileName: e.fileName, size: e.sizeBytes }))}
        onOpen={(id) => void open(id)}
      />
      {error ? (
        <p className="m-0 text-sm text-[var(--status-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

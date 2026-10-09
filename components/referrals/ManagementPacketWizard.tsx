"use client";

import { Fragment, useState } from "react";
import { AlertTriangle, Check, Pencil, RefreshCw, Send } from "lucide-react";
import { Button, TextArea, TextInput } from "@/components/ui";
import {
  PersonSwotCard,
  ProfileSwotSection,
  type MiniSwot,
} from "@/components/swot/InterventionSwotPair";
import { profileSwotNewHref } from "@/components/swot/ProfileSwotPanel";
import { seSwotCreateHref } from "@/lib/se-workspace-nav";
import { sseSwotCreateHref } from "@/lib/sse-workspace-nav";
import type { PerformanceSnapshotBody, TeamLeadUserSwot } from "@/lib/api";
import {
  emptySnapshotDraft,
  periodHeadline,
  snapshotFieldId,
  snapshotMissing,
  snapshotMissingParts,
  summaryFromDraft,
  toSnapshotFields,
  type SnapshotDraft,
} from "@/lib/performance-snapshot";
import {
  EvidenceList,
  EvidenceUploader,
  SnapshotSubjectCard,
  SnapshotSummaryCard,
  type EvidenceFile,
  type SnapshotCardSubject,
} from "@/components/referrals/PerformanceSnapshot";

export type AssignedSupportPerson = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ProvideForm = {
  whySalesIsDown: string;
  whatIsTheGap: string;
  detailedSummaryOfGap: string;
  supportAlreadyProvided: string;
  supportRequiredFromCommando: string;
  recommendationFocus: string;
  priority1: string;
  priority2: string;
  priority3: string;
  snapshot: {
    /** Keyed by subject user id. */
    drafts: Record<string, SnapshotDraft>;
    evidence: EvidenceFile[];
  };
};

type TextField = Exclude<keyof ProvideForm, "snapshot">;

export function snapshotDraftFor(form: ProvideForm, userId: string): SnapshotDraft {
  return form.snapshot.drafts[userId] ?? emptySnapshotDraft();
}

/** Missing required snapshot parts per person, e.g. ["Sam Seller: Trend, TL's note"]. */
export function snapshotGaps(form: ProvideForm, subjects: SnapshotCardSubject[]): string[] {
  return subjects.flatMap((s) => {
    const missing = snapshotMissing(snapshotDraftFor(form, s.userId));
    return missing.length > 0 ? [`${s.name}: ${missing.join(", ")}`] : [];
  });
}

export function performanceSnapshotPayload(
  form: ProvideForm,
  subjects: SnapshotCardSubject[],
): PerformanceSnapshotBody {
  const [se, ...supports] = subjects;
  return {
    salesExecutive: toSnapshotFields(snapshotDraftFor(form, se!.userId)),
    salesSupport: supports.map((s) => ({
      subjectUserId: s.userId,
      ...toSnapshotFields(snapshotDraftFor(form, s.userId)),
    })),
    evidence: form.snapshot.evidence.map(({ key, fileName, contentType, size }) => ({
      key,
      fileName,
      contentType,
      size,
    })),
  };
}

export function emptyProvideForm(): ProvideForm {
  return {
    whySalesIsDown: "",
    whatIsTheGap: "",
    detailedSummaryOfGap: "",
    supportAlreadyProvided: "",
    supportRequiredFromCommando: "",
    recommendationFocus: "",
    priority1: "",
    priority2: "",
    priority3: "",
    snapshot: { drafts: {}, evidence: [] },
  };
}

/** Team Lead User SWOTs not written yet, e.g. ["your SWOT for Priya Rao (SSE)"]. */
export function missingUserSwots(people: TeamLeadUserSwot[]): string[] {
  return people
    .filter((p) => !p.swot)
    .map(
      (p) =>
        `your SWOT for ${p.name} (${p.role === "SALES_SUPPORT_EXECUTIVE" ? "SSE" : "SE"})`,
    );
}

/** SWOTs not written yet, e.g. ["your SWOT for Priya Rao (SSE)", "Profile SWOT"]. */
export function missingInterventionSwots(
  people: TeamLeadUserSwot[],
  profileSwot: MiniSwot | null,
): string[] {
  return [...missingUserSwots(people), ...(profileSwot ? [] : ["Profile SWOT"])];
}

function MissingSwotsNotice({
  missing,
  refreshing,
  onRefresh,
}: {
  missing: string[];
  refreshing: boolean;
  onRefresh?: () => void;
}) {
  if (missing.length === 0) return null;
  return (
    <div
      className="flex flex-wrap items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] px-3 py-2.5 text-sm text-[var(--color-ink)]"
      role="status"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--status-warn)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-medium">Not written yet: {missing.join(", ")}</p>
        <p className="m-0 mt-0.5 text-[var(--color-ink-muted)]">
          Optional. Use the &quot;Add&quot; links below, then Refresh.
        </p>
      </div>
      {onRefresh ? (
        <Button variant="secondary" size="sm" disabled={refreshing} onClick={onRefresh}>
          <RefreshCw size={13} strokeWidth={2.2} aria-hidden />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      ) : null}
    </div>
  );
}

type WizardStep = {
  id:
    | "snapshot"
    | "supportSnapshot"
    | "diagnosis"
    | "support"
    | "priorities"
    | "swot"
    | "supportSwot"
    | "review";
  title: string;
  description: string;
  fields: readonly TextField[];
};

const SNAPSHOT_STEPS: WizardStep[] = [
  {
    id: "snapshot",
    title: "Performance Snapshot",
    description:
      "Give the Commando a quick picture of the employee's recent performance and the reason this intervention needs attention.",
    fields: [],
  },
  {
    id: "supportSnapshot",
    title: "SSE Snapshot",
    description:
      "The same quick picture for each Sales Support Executive linked to this Sales Executive.",
    fields: [],
  },
];

const HANDOFF_STEPS: WizardStep[] = [
  {
    id: "diagnosis",
    title: "Performance Diagnosis",
    description: "Explain why sales is down and what the gap is.",
    fields: [
      "whySalesIsDown",
      "whatIsTheGap",
      "detailedSummaryOfGap",
    ] as const,
  },
  {
    id: "support",
    title: "Support & Recommendation",
    description: "What has been tried, and what should Commando focus on?",
    fields: [
      "supportAlreadyProvided",
      "supportRequiredFromCommando",
      "recommendationFocus",
    ] as const,
  },
  {
    id: "priorities",
    title: "Intervention Priorities",
    description: "Rank the three most important focus areas.",
    fields: ["priority1", "priority2", "priority3"] as const,
  },
  {
    id: "swot",
    title: "SWOT",
    description:
      "The Sales Executive's SWOTs and the Profile SWOT go to the Commando with your request. Read-only here.",
    fields: [] as const,
  },
];

const SUPPORT_SWOT_STEP: WizardStep = {
  id: "supportSwot",
  title: "SSE SWOT",
  description:
    "The same SWOTs for each Sales Support Executive linked to this Sales Executive. Read-only here.",
  fields: [],
};

const REVIEW_STEP: WizardStep = {
  id: "review",
  title: "Ready to send?",
  description: "Here's the performance snapshot that will be shared with the Commando.",
  fields: [],
};

/** Sales Executive steps first; the SSE snapshot / SWOT steps only when an SSE is linked. */
export function wizardSteps(hasSupport: boolean, hasSupportSwots = hasSupport): WizardStep[] {
  return [
    SNAPSHOT_STEPS[0]!,
    ...(hasSupport ? [SNAPSHOT_STEPS[1]!] : []),
    ...HANDOFF_STEPS,
    ...(hasSupportSwots ? [SUPPORT_SWOT_STEP] : []),
    REVIEW_STEP,
  ];
}

const isSwotStep = (s: WizardStep) => s.id === "swot" || s.id === "supportSwot";

const isSnapshotStep = (s: WizardStep) =>
  s.id === "snapshot" || s.id === "supportSnapshot";

function fieldFilled(form: ProvideForm, key: TextField) {
  return form[key].trim().length > 0;
}

const FIELD_LABELS: Record<TextField, string> = {
  whySalesIsDown: "Why is sales down?",
  whatIsTheGap: "What is the gap?",
  detailedSummaryOfGap: "Detailed summary",
  supportAlreadyProvided: "Support already provided",
  supportRequiredFromCommando: "Support required from Commando",
  recommendationFocus: "Recommended focus",
  priority1: "Priority 1",
  priority2: "Priority 2",
  priority3: "Priority 3",
};

const textFieldId = (key: TextField) => `packet-${key}`;

type MissingGroup = { key: string; who: string | null; items: Array<{ id: string; label: string }> };

/** Scroll a required field into view and put the cursor on it. */
function jumpToField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const target = el.matches("input, textarea, button")
    ? el
    : el.querySelector<HTMLElement>("button, input, textarea");
  target?.focus({ preventScroll: true });
}

export function ManagementPacketWizard({
  form,
  setForm,
  busy,
  commandoName,
  subjects,
  profileId,
  teamLeadUserSwots = [],
  profileSwot = null,
  swotReturnTo,
  refreshingSwots = false,
  onRefreshSwots,
  onApprove,
  onReject,
}: {
  form: ProvideForm;
  setForm: (updater: (prev: ProvideForm) => ProvideForm) => void;
  busy: boolean;
  commandoName: string;
  /** SE first, then each linked Sales Support Executive. */
  subjects: SnapshotCardSubject[];
  /** SE profile id — used to link to the SE's User SWOT form. */
  profileId?: string;
  /** Latest Team Lead User SWOT for the SE, then each linked SSE. */
  teamLeadUserSwots?: TeamLeadUserSwot[];
  /** Latest Team Lead / Commando Profile SWOT for the SE profile. */
  profileSwot?: MiniSwot | null;
  /** Where the Profile SWOT form returns after saving. */
  swotReturnTo?: string;
  refreshingSwots?: boolean;
  /** Re-reads SWOTs after the Team Lead adds one in another tab. */
  onRefreshSwots?: () => void;
  /** @deprecated Kept for call-site compatibility; SWOT step removed. */
  assignedSupport?: AssignedSupportPerson[];
  onApprove: () => void;
  onReject: () => void;
}) {
  const seSubjects = subjects.slice(0, 1);
  const supportSubjects = subjects.slice(1);
  const seSwotPeople = teamLeadUserSwots.filter((p) => p.role === "SALES_EXECUTIVE");
  const sseSwotPeople = teamLeadUserSwots.filter((p) => p.role !== "SALES_EXECUTIVE");
  const STEPS = wizardSteps(
    supportSubjects.length > 0,
    supportSubjects.length > 0 || sseSwotPeople.length > 0,
  );
  const [step, setStepState] = useState(0);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const current = STEPS[Math.min(step, STEPS.length - 1)]!;
  const isLast = step === STEPS.length - 1;
  const showErrors = attemptedStep === step;

  function setStep(next: number | ((s: number) => number)) {
    setAttemptedStep(null);
    setStepState(next);
  }

  const missingSeSwots = missingInterventionSwots(seSwotPeople, profileSwot);
  const missingSseSwots = missingUserSwots(sseSwotPeople);
  const missingFor = (s: WizardStep) =>
    s.id === "supportSwot" ? missingSseSwots : missingSeSwots;
  const userSwotCreateHref = (p: TeamLeadUserSwot) =>
    p.role === "SALES_SUPPORT_EXECUTIVE"
      ? sseSwotCreateHref(p.subjectUserId, {
          name: p.name,
          returnTo: swotReturnTo,
        })
      : profileId
        ? seSwotCreateHref(profileId, {
            name: p.name,
            subjectUserId: p.subjectUserId,
            returnTo: swotReturnTo,
          })
        : null;
  const seGaps = snapshotGaps(form, seSubjects);
  const supportGaps = snapshotGaps(form, supportSubjects);

  const stepSubjects =
    current.id === "snapshot" ? seSubjects : current.id === "supportSnapshot" ? supportSubjects : [];
  const missingGroups: MissingGroup[] = isSnapshotStep(current)
    ? stepSubjects.flatMap((s) => {
        const parts = snapshotMissingParts(snapshotDraftFor(form, s.userId));
        return parts.length > 0
          ? [
              {
                key: s.userId || s.name,
                who: s.name,
                items: parts.map((p) => ({
                  id: snapshotFieldId(s.userId, p.part),
                  label: p.label,
                })),
              },
            ]
          : [];
      })
    : (() => {
        const items = current.fields
          .filter((key) => !fieldFilled(form, key))
          .map((key) => ({ id: textFieldId(key), label: FIELD_LABELS[key] }));
        return items.length > 0 ? [{ key: current.id, who: null, items }] : [];
      })();
  const missingCount = missingGroups.reduce((n, g) => n + g.items.length, 0);

  const fieldError = (key: TextField) =>
    showErrors && !fieldFilled(form, key) ? "This field is required." : undefined;

  // Missing SWOTs warn but never block approval.
  const stepComplete = STEPS.slice(0, STEPS.length - 1).map((s) =>
    s.id === "snapshot"
      ? seGaps.length === 0
      : s.id === "supportSnapshot"
        ? supportGaps.length === 0
        : s.fields.every((key) => fieldFilled(form, key)),
  );

  function patchDraft(userId: string, draft: SnapshotDraft) {
    setForm((prev) => ({
      ...prev,
      snapshot: { ...prev.snapshot, drafts: { ...prev.snapshot.drafts, [userId]: draft } },
    }));
  }

  function patchEvidence(updater: (prev: EvidenceFile[]) => EvidenceFile[]) {
    setForm((prev) => ({
      ...prev,
      snapshot: { ...prev.snapshot, evidence: updater(prev.snapshot.evidence) },
    }));
  }

  function patch(key: TextField, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    const first = missingGroups[0]?.items[0];
    if (first) {
      setAttemptedStep(step);
      jumpToField(first.id);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  return (
    <section className="surface overflow-clip">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-4 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
          Management assessment
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">
          Step {step + 1} of {STEPS.length} — {current.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {current.description}
        </p>
        <ol className="mt-4 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  if (i < step || stepComplete[i] || i === step) setStep(i);
                }}
                className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium ${
                  i === step
                    ? "bg-[var(--color-brand)] text-[var(--color-brand-on)]"
                    : stepComplete[i] || i < step
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                      : "bg-[var(--color-surface)] text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]"
                }`}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-5">
        {current.id === "snapshot" && (
          <div className="snap-step">
            <p className="snap-window">
              <span className="snap-window-dot" aria-hidden />
              {periodHeadline(seSubjects[0]?.period)}
            </p>
            {seSubjects.map((s) => (
              <SnapshotSubjectCard
                key={s.userId || s.name}
                subject={s}
                draft={snapshotDraftFor(form, s.userId)}
                onChange={(d) => patchDraft(s.userId, d)}
                showErrors={showErrors}
              />
            ))}
            <EvidenceUploader files={form.snapshot.evidence} onChange={patchEvidence} />
          </div>
        )}

        {current.id === "supportSnapshot" && (
          <div className="snap-step">
            <p className="snap-window">
              <span className="snap-window-dot" aria-hidden />
              {periodHeadline(supportSubjects[0]?.period)}
            </p>
            {supportSubjects.map((s) => (
              <SnapshotSubjectCard
                key={s.userId || s.name}
                subject={s}
                draft={snapshotDraftFor(form, s.userId)}
                onChange={(d) => patchDraft(s.userId, d)}
                showErrors={showErrors}
              />
            ))}
          </div>
        )}

        {current.id === "diagnosis" && (
          <>
            <TextArea
              label="Why is sales down?"
              hint="Business context the Commando needs before intervening."
              rows={4}
              required
              id={textFieldId("whySalesIsDown")}
              error={fieldError("whySalesIsDown")}
              value={form.whySalesIsDown}
              onChange={(e) => patch("whySalesIsDown", e.target.value)}
            />
            <TextArea
              label="What is the gap?"
              hint="Skill, process, or pipeline gap versus expectation."
              rows={4}
              required
              id={textFieldId("whatIsTheGap")}
              error={fieldError("whatIsTheGap")}
              value={form.whatIsTheGap}
              onChange={(e) => patch("whatIsTheGap", e.target.value)}
            />
            <TextArea
              label="Detailed summary of the gap"
              rows={5}
              required
              id={textFieldId("detailedSummaryOfGap")}
              error={fieldError("detailedSummaryOfGap")}
              value={form.detailedSummaryOfGap}
              onChange={(e) => patch("detailedSummaryOfGap", e.target.value)}
            />
          </>
        )}

        {current.id === "support" && (
          <>
            <TextArea
              label="Support already provided"
              hint="What has already been attempted under Team Lead management?"
              rows={4}
              required
              id={textFieldId("supportAlreadyProvided")}
              error={fieldError("supportAlreadyProvided")}
              value={form.supportAlreadyProvided}
              onChange={(e) => patch("supportAlreadyProvided", e.target.value)}
            />
            <TextArea
              label="Support required from Commando"
              hint="What does the Commando need to do?"
              rows={4}
              required
              id={textFieldId("supportRequiredFromCommando")}
              error={fieldError("supportRequiredFromCommando")}
              value={form.supportRequiredFromCommando}
              onChange={(e) =>
                patch("supportRequiredFromCommando", e.target.value)
              }
            />
            <TextArea
              label="Recommended focus"
              hint="What should the intervention focus on?"
              rows={4}
              required
              id={textFieldId("recommendationFocus")}
              error={fieldError("recommendationFocus")}
              value={form.recommendationFocus}
              onChange={(e) => patch("recommendationFocus", e.target.value)}
            />
          </>
        )}

        {current.id === "priorities" && (
          <div className="space-y-4">
            {(
              [
                ["priority1", "Priority 1"],
                ["priority2", "Priority 2"],
                ["priority3", "Priority 3"],
              ] as const
            ).map(([key, label], index) => (
              <div key={key} className="flex gap-3">
                <span className="mt-7 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-xs font-semibold text-[var(--color-brand)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <TextInput
                    label={label}
                    required
                    id={textFieldId(key)}
                    error={fieldError(key)}
                    value={form[key]}
                    onChange={(e) => patch(key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {current.id === "swot" && (
          <div className="space-y-5">
            <MissingSwotsNotice
              missing={missingSeSwots}
              refreshing={refreshingSwots}
              onRefresh={onRefreshSwots}
            />
            {seSwotPeople.map((p) => (
              <PersonSwotCard key={p.subjectUserId} person={p} createHref={userSwotCreateHref} />
            ))}
            <ProfileSwotSection
              compact
              swot={profileSwot}
              createHref={
                profileId && swotReturnTo
                  ? profileSwotNewHref(
                      profileId,
                      swotReturnTo,
                      true,
                      seSwotPeople[0]?.name,
                    )
                  : null
              }
            />
          </div>
        )}

        {current.id === "supportSwot" && (
          <div className="space-y-5">
            <MissingSwotsNotice
              missing={missingSseSwots}
              refreshing={refreshingSwots}
              onRefresh={onRefreshSwots}
            />
            {sseSwotPeople.length > 0 ? (
              sseSwotPeople.map((p) => (
                <PersonSwotCard key={p.subjectUserId} person={p} createHref={userSwotCreateHref} />
              ))
            ) : (
              <p className="m-0 text-sm text-[var(--color-ink-muted)]">
                No SWOTs for the linked Sales Support Executives yet.
              </p>
            )}
          </div>
        )}

        {current.id === "review" && (
          <div className="snap-step">
            <div className="snap-summary-grid">
              {subjects.map((s) => (
                <SnapshotSummaryCard
                  key={s.userId || s.name}
                  summary={summaryFromDraft(s, snapshotDraftFor(form, s.userId))}
                />
              ))}
            </div>
            <EvidenceList
              files={form.snapshot.evidence.map((f) => ({
                id: f.id,
                fileName: f.fileName,
                size: f.size,
              }))}
            />
            <div className="snap-also">
              <p className="snap-field-label">Also included in the handoff</p>
              <ul>
                {STEPS.slice(0, -1).filter((s) => !isSnapshotStep(s)).map((s) => {
                  const isSwot = isSwotStep(s);
                  const missing = isSwot ? missingFor(s) : [];
                  const done = isSwot
                    ? missing.length === 0
                    : stepComplete[STEPS.indexOf(s)];
                  return (
                    <li key={s.id} className={done ? "is-done" : "is-missing"}>
                      {done ? <Check size={13} strokeWidth={2.6} aria-hidden /> : null}
                      <button
                        type="button"
                        className="snap-link"
                        onClick={() => setStep(STEPS.indexOf(s))}
                      >
                        {s.title}
                      </button>
                      {done ? null : (
                        <span>
                          {isSwot
                            ? `· ${missing.length} missing (optional)`
                            : "· incomplete"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="m-0 text-sm text-[var(--color-ink-muted)]">
              Shared with{" "}
              <span className="font-medium text-[var(--color-ink)]">{commandoName}</span> as
              read-only context. You remain the owner of the assessment.
            </p>
          </div>
        )}

        {!isLast && (
          <p className="m-0 text-xs text-[var(--color-ink-muted)]">
            Fields marked <span className="text-[var(--status-danger)]">*</span> are required.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 z-10 space-y-3 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 sm:px-5">
        {missingCount > 0 && !isLast ? (
          <div
            className={`flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm ${
              showErrors
                ? "border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)]"
                : "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]"
            }`}
            role="status"
            aria-live="polite"
          >
            <AlertTriangle
              size={16}
              className={`mt-0.5 shrink-0 ${
                showErrors ? "text-[var(--status-danger)]" : "text-[var(--status-warn)]"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="m-0 font-medium text-[var(--color-ink)]">
                {showErrors
                  ? `Fill in ${missingCount} required field${missingCount === 1 ? "" : "s"} to continue`
                  : `${missingCount} required field${missingCount === 1 ? "" : "s"} left on this step`}
              </p>
              <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
                {missingGroups.map((g) => (
                  <li key={g.key} className="text-[var(--color-ink-muted)]">
                    {g.who ? (
                      <span className="font-medium text-[var(--color-ink)]">{g.who}: </span>
                    ) : null}
                    {g.items.map((item, i) => (
                      <Fragment key={item.id}>
                        {i > 0 ? ", " : null}
                        <button
                          type="button"
                          className="snap-link"
                          onClick={() => jumpToField(item.id)}
                        >
                          {item.label}
                        </button>
                      </Fragment>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="danger" disabled={busy} onClick={onReject}>
            Reject Request
          </Button>
          <div className="flex flex-wrap gap-2">
            {isLast ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setStep(0)}
              >
                <Pencil size={14} strokeWidth={2.2} aria-hidden />
                Edit Snapshot
              </Button>
            ) : step > 0 ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
            ) : null}
            {!isLast ? (
              <Button disabled={busy} onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button
                disabled={busy || stepComplete.some((ok) => !ok)}
                onClick={onApprove}
              >
                <Send size={14} strokeWidth={2.2} aria-hidden />
                {busy ? "Sending…" : "Approve & Send to Commando"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

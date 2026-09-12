"use client";

import { useMemo, useState } from "react";
import { Button, TextArea, TextInput } from "@/components/ui";

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
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
};

export const emptyProvideForm: ProvideForm = {
  whySalesIsDown: "",
  whatIsTheGap: "",
  detailedSummaryOfGap: "",
  supportAlreadyProvided: "",
  supportRequiredFromCommando: "",
  recommendationFocus: "",
  priority1: "",
  priority2: "",
  priority3: "",
  strength: "",
  weakness: "",
  opportunity: "",
  threat: "",
};

const STEPS = [
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
    title: "Management SWOT",
    description: "Team Lead assessment — separate from SE or Commando SWOT.",
    fields: ["strength", "weakness", "opportunity", "threat"] as const,
  },
  {
    id: "review",
    title: "Review & Approve",
    description: "Confirm the management packet before handoff.",
    fields: [] as const,
  },
] as const;

function fieldFilled(form: ProvideForm, key: keyof ProvideForm) {
  return form[key].trim().length > 0;
}

export function ManagementPacketWizard({
  form,
  setForm,
  busy,
  commandoName,
  onApprove,
  onReject,
}: {
  form: ProvideForm;
  setForm: (updater: (prev: ProvideForm) => ProvideForm) => void;
  busy: boolean;
  commandoName: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const missingOnStep = useMemo(() => {
    return current.fields.filter((key) => !fieldFilled(form, key));
  }, [current.fields, form]);

  const stepComplete = STEPS.slice(0, 4).map((s) =>
    s.fields.every((key) => fieldFilled(form, key)),
  );

  function patch(key: keyof ProvideForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (missingOnStep.length > 0) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  return (
    <section className="surface overflow-hidden">
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
                    ? "bg-[var(--color-brand)] text-white"
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
        {current.id === "diagnosis" && (
          <>
            <TextArea
              label="Why is sales down?"
              hint="Business context the Commando needs before intervening."
              rows={4}
              required
              value={form.whySalesIsDown}
              onChange={(e) => patch("whySalesIsDown", e.target.value)}
            />
            <TextArea
              label="What is the gap?"
              hint="Skill, process, or pipeline gap versus expectation."
              rows={4}
              required
              value={form.whatIsTheGap}
              onChange={(e) => patch("whatIsTheGap", e.target.value)}
            />
            <TextArea
              label="Detailed summary of the gap"
              rows={5}
              required
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
              value={form.supportAlreadyProvided}
              onChange={(e) => patch("supportAlreadyProvided", e.target.value)}
            />
            <TextArea
              label="Support required from Commando"
              hint="What does the Commando need to do?"
              rows={4}
              required
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
                    value={form[key]}
                    onChange={(e) => patch(key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {current.id === "swot" && (
          <>
            <p className="text-sm font-medium text-[var(--color-ink)]">
              Team Lead Assessment
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextArea
                label="Strengths"
                rows={4}
                required
                value={form.strength}
                onChange={(e) => patch("strength", e.target.value)}
              />
              <TextArea
                label="Weaknesses"
                rows={4}
                required
                value={form.weakness}
                onChange={(e) => patch("weakness", e.target.value)}
              />
              <TextArea
                label="Opportunities"
                rows={4}
                required
                value={form.opportunity}
                onChange={(e) => patch("opportunity", e.target.value)}
              />
              <TextArea
                label="Threats"
                rows={4}
                required
                value={form.threat}
                onChange={(e) => patch("threat", e.target.value)}
              />
            </div>
          </>
        )}

        {current.id === "review" && (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm">
              {[
                ["Performance Diagnosis", stepComplete[0]],
                ["Support & Recommendation", stepComplete[1]],
                ["Priorities", stepComplete[2]],
                ["SWOT", stepComplete[3]],
              ].map(([label, done]) => (
                <li
                  key={String(label)}
                  className="flex items-center justify-between border border-[var(--color-line)] px-3 py-2"
                >
                  <span>{label}</span>
                  <span
                    className={
                      done
                        ? "font-medium text-[var(--status-success)]"
                        : "text-[var(--status-danger)]"
                    }
                  >
                    {done ? "✓ Completed" : "Incomplete"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[var(--color-ink-muted)]">
              This information will be shared with{" "}
              <span className="font-medium text-[var(--color-ink)]">
                {commandoName}
              </span>{" "}
              as read-only management context. You remain the owner of the
              assessment.
            </p>
          </div>
        )}

        {missingOnStep.length > 0 && !isLast && (
          <p className="text-sm text-[var(--status-danger)]" role="status">
            {missingOnStep.length} field
            {missingOnStep.length === 1 ? "" : "s"} required before continuing
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 sm:px-5">
        <Button
          variant="danger"
          disabled={busy}
          onClick={onReject}
        >
          Reject Request
        </Button>
        <div className="flex flex-wrap gap-2">
          {step > 0 && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
          )}
          {!isLast ? (
            <Button
              disabled={busy || missingOnStep.length > 0}
              onClick={goNext}
            >
              Continue
            </Button>
          ) : (
            <Button
              disabled={busy || stepComplete.some((ok) => !ok)}
              onClick={onApprove}
            >
              {busy ? "Approving…" : "Approve & Provide Information"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

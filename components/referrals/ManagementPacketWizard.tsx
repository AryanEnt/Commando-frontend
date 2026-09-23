"use client";

import { useMemo, useState } from "react";
import { Button, TextArea, TextInput } from "@/components/ui";

export type SwotQuadrants = {
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
};

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
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
  supportSwots: Record<string, SwotQuadrants>;
};

const emptyQuadrants = (): SwotQuadrants => ({
  strength: "",
  weakness: "",
  opportunity: "",
  threat: "",
});

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
  supportSwots: {},
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
    title: "Profile SWOT",
    description:
      "Team Lead assessment of the sales profile/workspace, plus SWOT for each assigned Sales Support.",
    fields: ["strength", "weakness", "opportunity", "threat"] as const,
  },
  {
    id: "review",
    title: "Review & Approve",
    description: "Confirm the management packet before handoff.",
    fields: [] as const,
  },
] as const;

function fieldFilled(form: ProvideForm, key: keyof Omit<ProvideForm, "supportSwots">) {
  return form[key].trim().length > 0;
}

function quadrantsFilled(q: SwotQuadrants | undefined) {
  if (!q) return false;
  return (
    q.strength.trim().length > 0 &&
    q.weakness.trim().length > 0 &&
    q.opportunity.trim().length > 0 &&
    q.threat.trim().length > 0
  );
}

function supportSwotComplete(
  form: ProvideForm,
  assignedSupport: AssignedSupportPerson[],
) {
  return assignedSupport.every((person) =>
    quadrantsFilled(form.supportSwots[person.userId]),
  );
}

export function ManagementPacketWizard({
  form,
  setForm,
  busy,
  commandoName,
  assignedSupport = [],
  onApprove,
  onReject,
}: {
  form: ProvideForm;
  setForm: (updater: (prev: ProvideForm) => ProvideForm) => void;
  busy: boolean;
  commandoName: string;
  assignedSupport?: AssignedSupportPerson[];
  onApprove: () => void;
  onReject: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const missingOnStep = useMemo(() => {
    const missing = current.fields.filter((key) => !fieldFilled(form, key));
    if (current.id === "swot") {
      for (const person of assignedSupport) {
        const q = form.supportSwots[person.userId];
        const name = `${person.firstName} ${person.lastName}`.trim();
        if (!q?.strength.trim()) missing.push(`${name} strengths` as never);
        if (!q?.weakness.trim()) missing.push(`${name} weaknesses` as never);
        if (!q?.opportunity.trim())
          missing.push(`${name} opportunities` as never);
        if (!q?.threat.trim()) missing.push(`${name} threats` as never);
      }
    }
    return missing;
  }, [assignedSupport, current.fields, current.id, form]);

  const stepComplete = STEPS.slice(0, 4).map((s) =>
    s.id === "swot"
      ? s.fields.every((key) => fieldFilled(form, key)) &&
        supportSwotComplete(form, assignedSupport)
      : s.fields.every((key) => fieldFilled(form, key)),
  );

  function patch(key: keyof Omit<ProvideForm, "supportSwots">, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function patchSupport(
    userId: string,
    key: keyof SwotQuadrants,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      supportSwots: {
        ...prev.supportSwots,
        [userId]: {
          ...(prev.supportSwots[userId] ?? emptyQuadrants()),
          [key]: value,
        },
      },
    }));
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
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                Profile SWOT
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                Team Lead assessment of this sales profile / workspace.
              </p>
            </div>
            <SwotQuadrantFields
              value={{
                strength: form.strength,
                weakness: form.weakness,
                opportunity: form.opportunity,
                threat: form.threat,
              }}
              onChange={(key, value) => patch(key, value)}
            />

            {assignedSupport.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                No Sales Support is currently assigned to this profile. Profile
                SWOT only is required.
              </p>
            ) : (
              assignedSupport.map((person) => {
                const name = `${person.firstName} ${person.lastName}`.trim();
                const q = form.supportSwots[person.userId] ?? emptyQuadrants();
                return (
                  <div key={person.userId} className="space-y-3 border-t border-[var(--color-line)] pt-4">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        Sales Support SWOT — {name}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        Team Lead assessment of the Sales Support assigned to
                        this intervention.
                      </p>
                    </div>
                    <SwotQuadrantFields
                      value={q}
                      onChange={(key, value) =>
                        patchSupport(person.userId, key, value)
                      }
                    />
                  </div>
                );
              })
            )}
          </>
        )}

        {current.id === "review" && (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm">
              {[
                ["Performance Diagnosis", stepComplete[0]],
                ["Support & Recommendation", stepComplete[1]],
                ["Priorities", stepComplete[2]],
                ["Profile SWOT", stepComplete[3]],
                ...(assignedSupport.length > 0
                  ? ([["Sales Support SWOT", supportSwotComplete(form, assignedSupport)]] as const)
                  : []),
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

function SwotQuadrantFields({
  value,
  onChange,
}: {
  value: SwotQuadrants;
  onChange: (key: keyof SwotQuadrants, value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextArea
        label="Strengths"
        rows={4}
        required
        value={value.strength}
        onChange={(e) => onChange("strength", e.target.value)}
      />
      <TextArea
        label="Weaknesses"
        rows={4}
        required
        value={value.weakness}
        onChange={(e) => onChange("weakness", e.target.value)}
      />
      <TextArea
        label="Opportunities"
        rows={4}
        required
        value={value.opportunity}
        onChange={(e) => onChange("opportunity", e.target.value)}
      />
      <TextArea
        label="Threats"
        rows={4}
        required
        value={value.threat}
        onChange={(e) => onChange("threat", e.target.value)}
      />
    </div>
  );
}

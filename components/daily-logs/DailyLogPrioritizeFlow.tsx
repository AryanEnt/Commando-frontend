"use client";

import { useMemo, useState } from "react";
import type { DailyLog, DailyLogEntry } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui";

export type PriorityStep = 1 | 2 | 3 | 4 | "review";

export type Classification = {
  entryId: string;
  urgency: "URGENT" | "NOT_URGENT";
  importance: "IMPORTANT" | "NOT_IMPORTANT";
};

const STEPS: {
  step: 1 | 2 | 3 | 4;
  /** Plain-language action for this bucket */
  verb: string;
  /** Eisenhower quadrant label */
  quadrant: string;
  urgency: Classification["urgency"];
  importance: Classification["importance"];
  /** One-line coaching hint */
  hint: string;
  /** Tag colors */
  badge: string;
  cardSelected: string;
  dot: string;
}[] = [
  {
    step: 1,
    verb: "Do first",
    quadrant: "Urgent & Important",
    hint: "Needs your attention now — pick any that belong here.",
    urgency: "URGENT",
    importance: "IMPORTANT",
    badge: "bg-red-100 text-red-800",
    cardSelected: "border-red-400 bg-red-50",
    dot: "bg-red-500",
  },
  {
    step: 2,
    verb: "Handle quickly",
    quadrant: "Urgent & Not Important",
    hint: "Time-sensitive but lower impact — pick any that belong here.",
    urgency: "URGENT",
    importance: "NOT_IMPORTANT",
    badge: "bg-orange-100 text-orange-800",
    cardSelected: "border-orange-400 bg-orange-50",
    dot: "bg-orange-500",
  },
  {
    step: 3,
    verb: "Plan for later",
    quadrant: "Not Urgent & Important",
    hint: "Matters, but not today — pick any that belong here.",
    urgency: "NOT_URGENT",
    importance: "IMPORTANT",
    badge: "bg-amber-100 text-amber-900",
    cardSelected: "border-amber-400 bg-amber-50",
    dot: "bg-amber-500",
  },
  {
    step: 4,
    verb: "Low priority",
    quadrant: "Not Urgent & Not Important",
    hint: "Nice to note, but not Eisenhower-critical — pick any that belong here.",
    urgency: "NOT_URGENT",
    importance: "NOT_IMPORTANT",
    badge: "bg-slate-200 text-slate-700",
    cardSelected: "border-slate-400 bg-slate-100",
    dot: "bg-slate-500",
  },
];

function stepKey(step: 1 | 2 | 3 | 4) {
  return STEPS[step - 1]!;
}

function formatEntryTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DailyLogPrioritizeFlow({
  log,
  submitting,
  onBackToEntries,
  onSubmit,
}: {
  log: DailyLog;
  submitting: boolean;
  onBackToEntries: () => void;
  onSubmit: (classifications: Classification[]) => void | Promise<void>;
}) {
  const [step, setStep] = useState<PriorityStep>(1);
  const [picked, setPicked] = useState<Record<string, 1 | 2 | 3 | 4>>({});

  const classifiedForStep = (s: 1 | 2 | 3 | 4) =>
    Object.entries(picked)
      .filter(([, v]) => v === s)
      .map(([id]) => id);

  const remaining = useMemo(() => {
    if (step === "review") return [];
    return log.entries.filter((e) => {
      const assigned = picked[e.id];
      if (!assigned) return true;
      return assigned === step;
    });
  }, [log.entries, picked, step]);

  const sortedCount = Object.keys(picked).length;
  const leftCount = log.entries.length - sortedCount;

  function toggle(entryId: string) {
    if (step === "review") return;
    setPicked((prev) => {
      const next = { ...prev };
      if (next[entryId] === step) {
        delete next[entryId];
      } else {
        next[entryId] = step;
      }
      return next;
    });
  }

  function buildClassifications(): Classification[] {
    return Object.entries(picked).map(([entryId, s]) => {
      const meta = stepKey(s);
      return {
        entryId,
        urgency: meta.urgency,
        importance: meta.importance,
      };
    });
  }

  function entriesForStep(s: 1 | 2 | 3 | 4): DailyLogEntry[] {
    const ids = new Set(classifiedForStep(s));
    return log.entries.filter((e) => ids.has(e.id));
  }

  const unprioritized = log.entries.filter((e) => !picked[e.id]);
  const selectedThisStep =
    step === "review" ? 0 : classifiedForStep(step).length;

  if (step === "review") {
    return (
      <div className="space-y-6 pb-8">
        <header className="space-y-2">
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            onClick={() => setStep(4)}
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
            Ready to submit?
          </h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {formatDate(log.logDate)} ·{" "}
            {log.profile?.displayName ??
              (log.executiveUser
                ? `${log.executiveUser.firstName} ${log.executiveUser.lastName}`
                : "—")}{" "}
            · {log.entryCount}{" "}
            {log.entryCount === 1 ? "activity" : "activities"}
          </p>
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-[var(--color-ink-muted)]">
            Selected activities go to Eisenhower. Anything left unselected stays
            in Daily Log History only.
          </p>
        </header>

        <div className="space-y-3">
          {STEPS.map((s) => {
            const items = entriesForStep(s.step);
            return (
              <section
                key={s.step}
                className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.badge}`}
                  >
                    {s.verb}
                  </span>
                  <span className="text-[13px] text-[var(--color-ink-muted)]">
                    {s.quadrant}
                  </span>
                  <span className="ml-auto text-[12px] tabular-nums text-[var(--color-ink-subtle)]">
                    {items.length} → Eisenhower
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="mt-2 text-[13px] text-[var(--color-ink-subtle)]">
                    None
                  </p>
                ) : (
                  <ul className="mt-2.5 space-y-1.5">
                    {items.map((e) => (
                      <li
                        key={e.id}
                        className="text-sm font-medium text-[var(--color-ink)]"
                      >
                        {e.sessionTitle}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <section className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)]/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]">
                History only
              </span>
              <span className="ml-auto text-[12px] tabular-nums text-[var(--color-ink-subtle)]">
                {unprioritized.length} not in Eisenhower
              </span>
            </div>
            <p className="mt-2 text-[13px] text-[var(--color-ink-muted)]">
              These stay in Daily Log History and will not be added to
              Eisenhower.
            </p>
            {unprioritized.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5">
                {unprioritized.map((e) => (
                  <li
                    key={e.id}
                    className="text-sm font-medium text-[var(--color-ink)]"
                  >
                    {e.sessionTitle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-[var(--color-ink-subtle)]">
                All activities were prioritized.
              </p>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-line)] pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => setStep(4)}
          >
            ← Change priorities
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void onSubmit(buildClassifications())}
          >
            {submitting ? "Submitting…" : "Submit Daily Log"}
          </Button>
        </div>
      </div>
    );
  }

  const meta = stepKey(step);
  const alreadyPlacedElsewhere = log.entries.length - remaining.length;

  return (
    <div className="space-y-5 pb-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
              Before you submit
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-ink)]">
              Sort into Eisenhower
            </h2>
          </div>
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            onClick={onBackToEntries}
          >
            ← Back to journal
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Tap activities that fit this bucket. You&apos;ll go through four
          buckets. Anything you never select stays in Daily Log History — not
          Eisenhower.
        </p>

        <StepRail current={step} />

        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${meta.badge}`}
            >
              Step {step} of 4 · {meta.verb}
            </span>
            <span className="text-[13px] font-medium text-[var(--color-ink)]">
              {meta.quadrant}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            {meta.hint}
          </p>
          <p className="mt-2 text-[12px] tabular-nums text-[var(--color-ink-subtle)]">
            {sortedCount} sorted · {leftCount} still open
            {alreadyPlacedElsewhere > 0
              ? ` · ${alreadyPlacedElsewhere} already placed in earlier steps`
              : ""}
          </p>
        </div>
      </header>

      {remaining.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] px-4 py-10 text-center">
          <p className="font-medium text-[var(--color-ink)]">
            Nothing left for this bucket
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Every activity was already placed. Continue to the next step.
          </p>
        </div>
      ) : (
        <ul
          className="space-y-2.5"
          role="listbox"
          aria-label={`${meta.verb}: ${meta.quadrant}`}
        >
          {remaining.map((entry) => {
            const selected = picked[entry.id] === step;
            return (
              <li key={entry.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => toggle(entry.id)}
                  className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${
                    selected
                      ? meta.cardSelected + " shadow-[var(--shadow-sm)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                      selected
                        ? `${meta.dot} border-transparent text-white`
                        : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[var(--color-ink)]">
                        {entry.sessionTitle}
                      </span>
                      {selected ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}
                        >
                          {meta.verb}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block line-clamp-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                      {entry.observation}
                    </span>
                    <span className="mt-2 block text-[12px] tabular-nums text-[var(--color-ink-subtle)]">
                      {formatEntryTime(entry.loggedAt)}
                      {!selected ? " · Tap to place here" : " · Tap to remove"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--color-ink-muted)]">
            {selectedThisStep === 0 ? (
              <>None selected — you can skip</>
            ) : (
              <>
                <span className="font-semibold text-[var(--color-ink)]">
                  {selectedThisStep}
                </span>{" "}
                going to <span className="font-medium">{meta.verb}</span>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (step === 1) onBackToEntries();
                else setStep((step - 1) as 1 | 2 | 3);
              }}
            >
              ← Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (step === 4) setStep("review");
                else setStep((step + 1) as 2 | 3 | 4);
              }}
            >
              {step === 4
                ? "See summary →"
                : selectedThisStep === 0
                  ? "Skip this bucket →"
                  : "Next bucket →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRail({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Prioritization steps">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s) => {
          const active = s.step === current;
          const done = s.step < current;
          return (
            <li
              key={s.step}
              aria-current={active ? "step" : undefined}
              className={`rounded-[var(--radius-sm)] border px-2.5 py-2 ${
                active
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : done
                    ? "border-[var(--color-line)] bg-[var(--color-surface-2)]/80"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] opacity-70"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                {done ? "Done" : active ? "Now" : `Step ${s.step}`}
              </p>
              <p
                className={`mt-0.5 text-[12px] font-semibold leading-tight ${
                  active
                    ? "text-[var(--color-brand-dark)]"
                    : "text-[var(--color-ink)]"
                }`}
              >
                {s.verb}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

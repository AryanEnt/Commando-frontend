"use client";

import { useReducer } from "react";
import { X } from "lucide-react";
import {
  type DailyWorkLog,
  type DailyWorkLogAttachmentUpload,
  type WorkActivityInput,
  type WorkActivityOption,
} from "@/lib/api";
import { Button, IconButton } from "@/components/ui";
import { toLocalDateInput, toLocalTimeInput } from "@/lib/dates";
import {
  EMPTY_DRAFT,
  activityAccent,
  builderReducer,
  builderStage,
  draftDuration,
  draftFromEntry,
  draftToInput,
  formatDuration,
  validateDraft,
  type BuilderDraft,
} from "@/lib/work-activities";
import {
  WorkEvidenceField,
  useWorkEvidence,
} from "@/components/daily-work-logs/WorkEvidenceField";

export type BuilderSubmit = {
  input: WorkActivityInput;
  attachments: DailyWorkLogAttachmentUpload[];
  removeAttachmentIds: string[];
};

function initialDraft(
  editing: DailyWorkLog | null | undefined,
  preset: { listItem: string; subItem: string | null } | null | undefined,
): BuilderDraft {
  if (editing) return draftFromEntry(editing);
  // Most activities are logged right after finishing, so end defaults to now.
  const fresh = { ...EMPTY_DRAFT, endTime: toLocalTimeInput() };
  return preset ? { ...fresh, ...preset } : fresh;
}

/**
 * Daily Log quick builder: activity → sub item → count / time (→ amount) →
 * optional evidence. Later steps only appear once the earlier choice is made.
 * Mount with a fresh `key` for each open.
 */
export function WorkActivityBuilder({
  activities,
  editing = null,
  preset = null,
  busy,
  onSubmit,
  onCancel,
}: {
  activities: WorkActivityOption[];
  editing?: DailyWorkLog | null;
  preset?: { listItem: string; subItem: string | null } | null;
  busy: boolean;
  onSubmit: (value: BuilderSubmit) => Promise<unknown> | void;
  onCancel: () => void;
}) {
  const title = editing ? "Edit activity" : "Add activity";
  const [draft, dispatch] = useReducer(
    builderReducer,
    undefined,
    () => initialDraft(editing, preset),
  );
  const activity = activities.find((a) => a.code === draft.listItem);
  const stage = builderStage(draft, activity);
  const problem = validateDraft(draft, activity);
  const duration = draftDuration(draft);
  const evidence = useWorkEvidence(editing?.attachments ?? []);

  function submit() {
    if (!activity || problem || busy || evidence.uploading) return;
    const day = toLocalDateInput(editing ? (editing.startedAt ?? editing.loggedAt) : null);
    void onSubmit({
      input: draftToInput(draft, activity, day),
      attachments: evidence.uploads,
      removeAttachmentIds: evidence.removedIds,
    });
  }

  return (
    <form
      className="wl-builder"
      aria-label={title}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <header className="wl-builder-head">
        <p className="wl-builder-title">{title}</p>
        <IconButton label="Close" size="sm" onClick={onCancel} disabled={busy}>
          <X size={16} strokeWidth={2} aria-hidden />
        </IconButton>
      </header>

      <fieldset className="wl-step">
        <legend className="wl-step-label">What did you work on?</legend>
        <div className="wl-choice-grid">
          {activities.map((a) => {
            const selected = a.code === draft.listItem;
            return (
              <button
                key={a.code}
                type="button"
                aria-pressed={selected}
                className={`wl-choice accent-${activityAccent(a.code)}${selected ? " is-selected" : ""}`}
                onClick={() => dispatch({ type: "activity", code: a.code })}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {activity && activity.subItems.length > 0 ? (
        <fieldset className="wl-step wl-step-enter" key={`sub-${activity.code}`}>
          <legend className="wl-step-label">Sub item</legend>
          <div className="wl-chip-row">
            {activity.subItems.map((s) => {
              const selected = s.code === draft.subItem;
              return (
                <button
                  key={s.code}
                  type="button"
                  aria-pressed={selected}
                  className={`wl-chip${selected ? " is-selected" : ""}`}
                  onClick={() => dispatch({ type: "subItem", code: s.code })}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {activity && stage === "details" ? (
        <div className="wl-step wl-step-enter">
          <div className={`wl-fields${activity.hasAmount ? " has-amount" : ""}`}>
            <label className="wl-field">
              <span className="wl-field-label">Count</span>
              <input
                className="wl-input"
                inputMode="numeric"
                autoComplete="off"
                autoFocus={!editing}
                value={draft.count}
                placeholder="0"
                onChange={(e) => dispatch({ type: "count", value: e.target.value })}
              />
            </label>
            <label className="wl-field">
              <span className="wl-field-label">Start time</span>
              <input
                type="time"
                className="wl-input"
                value={draft.startTime}
                onChange={(e) =>
                  dispatch({ type: "startTime", value: e.target.value })
                }
              />
            </label>
            <label className="wl-field">
              <span className="wl-field-label">End time</span>
              <input
                type="time"
                className="wl-input"
                value={draft.endTime}
                onChange={(e) =>
                  dispatch({ type: "endTime", value: e.target.value })
                }
              />
            </label>
            <div className="wl-field">
              <span className="wl-field-label">Time spent</span>
              <output
                className={`wl-duration${duration === null ? " is-empty" : ""}`}
                aria-live="polite"
              >
                {duration === null ? "—" : formatDuration(duration)}
              </output>
            </div>
            {activity.hasAmount ? (
              <label className="wl-field">
                <span className="wl-field-label">Amount</span>
                <span className="wl-amount">
                  <span className="wl-amount-prefix" aria-hidden>
                    Rs.
                  </span>
                  <input
                    className="wl-input"
                    inputMode="decimal"
                    autoComplete="off"
                    value={draft.amount}
                    placeholder="50,000"
                    onChange={(e) =>
                      dispatch({ type: "amount", value: e.target.value })
                    }
                  />
                </span>
              </label>
            ) : null}
          </div>

          <WorkEvidenceField evidence={evidence} />
        </div>
      ) : null}

      <footer className="wl-builder-foot">
        {stage === "details" && problem ? (
          <p className="wl-builder-hint">{problem}</p>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={busy || evidence.uploading || Boolean(problem)}
        >
          {busy ? "Saving…" : editing ? "Save changes" : "Add Activity"}
        </Button>
      </footer>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Lock, NotebookPen, X } from "lucide-react";
import type { CommitmentPlanItem, WorkActivityOption } from "@/lib/api";
import {
  MAX_COMMITMENT_LENGTH,
  activityAccent,
  hasPlanItem,
  parseAmount,
  planItemLabel,
  planToInput,
  sanitizeCount,
  togglePlanItem,
  validatePlan,
  type PlanItem,
} from "@/lib/work-activities";
import { sanitizeAmountInput } from "@/lib/performance-snapshot";
import { Button, IconButton } from "@/components/ui";

export type CommitmentSubmit = {
  items: CommitmentPlanItem[];
  note: string | null;
};

/**
 * Today's commitment: pick any number of activities / sub items in one go,
 * then set a target for each. No time range. Mount with a fresh `key` for each open.
 */
export function CommitmentComposer({
  activities,
  busy,
  onSubmit,
  onCancel,
}: {
  activities: WorkActivityOption[];
  busy: boolean;
  onSubmit: (value: CommitmentSubmit) => Promise<unknown> | void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const focused = activities.find((a) => a.code === focus);
  const problem = validatePlan(items, activities);

  function pickActivity(activity: WorkActivityOption) {
    setFocus(activity.code);
    if (activity.subItems.length === 0) {
      setItems((prev) => togglePlanItem(prev, activity.code, null));
    }
  }

  function updateItem(target: PlanItem, patch: Partial<PlanItem>) {
    setItems((prev) => prev.map((i) => (i === target ? { ...i, ...patch } : i)));
  }

  return (
    <form
      className="wl-builder wl-commit-form"
      aria-label="Add commitment"
      onSubmit={(e) => {
        e.preventDefault();
        if (problem || busy) return;
        void onSubmit({
          items: planToInput(items, activities),
          note: note.trim() || null,
        });
      }}
    >
      <header className="wl-builder-head">
        <p className="wl-builder-title">Add commitment</p>
        <IconButton label="Close" size="sm" onClick={onCancel} disabled={busy}>
          <X size={16} strokeWidth={2} aria-hidden />
        </IconButton>
      </header>

      <fieldset className="wl-step">
        <legend className="wl-step-label">
          What do you plan to work on today? Pick all that apply.
        </legend>
        <div className="wl-choice-grid">
          {activities.map((a) => {
            const picked = items.filter((i) => i.listItem === a.code).length;
            const selected = picked > 0 || (a.code === focus && a.subItems.length > 0);
            return (
              <button
                key={a.code}
                type="button"
                aria-pressed={selected}
                className={`wl-choice accent-${activityAccent(a.code)}${selected ? " is-selected" : ""}`}
                onClick={() => pickActivity(a)}
              >
                {a.label}
                {picked > 0 && a.subItems.length > 0 ? (
                  <span className="wl-choice-count">{picked}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      {focused && focused.subItems.length > 0 ? (
        <fieldset className="wl-step wl-step-enter" key={`sub-${focused.code}`}>
          <legend className="wl-step-label">{focused.label} · sub items</legend>
          <div className="wl-chip-row">
            {focused.subItems.map((s) => {
              const selected = hasPlanItem(items, focused.code, s.code);
              return (
                <button
                  key={s.code}
                  type="button"
                  aria-pressed={selected}
                  className={`wl-chip${selected ? " is-selected" : ""}`}
                  onClick={() =>
                    setItems((prev) => togglePlanItem(prev, focused.code, s.code))
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {items.length > 0 ? (
        <fieldset className="wl-step wl-step-enter">
          <legend className="wl-step-label">Today&apos;s plan · set a target for each</legend>
          <ul className="wl-plan">
            {items.map((item) => {
              const activity = activities.find((a) => a.code === item.listItem);
              const label = planItemLabel(item, activities);
              const countMissing = item.count === "";
              const amountMissing =
                Boolean(activity?.hasAmount) && parseAmount(item.amount) === null;
              return (
                <li key={`${item.listItem}:${item.subItem ?? ""}`} className="wl-plan-row">
                  <span className="wl-plan-label">
                    <span className={`wl-pill accent-${activityAccent(item.listItem)}`}>
                      {activity?.label ?? item.listItem}
                    </span>
                    {item.subItem ? (
                      <span className="wl-plan-sub">
                        {activity?.subItems.find((s) => s.code === item.subItem)?.label ??
                          item.subItem}
                      </span>
                    ) : null}
                  </span>
                  <input
                    className={`wl-input wl-plan-count${countMissing ? " is-empty" : ""}`}
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`Target for ${label}`}
                    placeholder="Target"
                    value={item.count}
                    onChange={(e) => updateItem(item, { count: sanitizeCount(e.target.value) })}
                  />
                  {activity?.hasAmount ? (
                    <span className="wl-amount wl-plan-amount">
                      <span className="wl-amount-prefix" aria-hidden>
                        Rs.
                      </span>
                      <input
                        className={`wl-input${amountMissing ? " is-empty" : ""}`}
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label={`Amount for ${label}`}
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) =>
                          updateItem(item, { amount: sanitizeAmountInput(e.target.value) })
                        }
                      />
                    </span>
                  ) : null}
                  <IconButton
                    label={`Remove ${label}`}
                    size="sm"
                    onClick={() =>
                      setItems((prev) => togglePlanItem(prev, item.listItem, item.subItem))
                    }
                  >
                    <X size={14} strokeWidth={2} aria-hidden />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      {showNote ? (
        <label className="wl-field wl-step-enter">
          <span className="wl-field-label">Note (optional)</span>
          <textarea
            className="wl-input wl-textarea"
            rows={2}
            autoFocus
            maxLength={MAX_COMMITMENT_LENGTH}
            value={note}
            placeholder="Anything else you plan to do today"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      ) : (
        <div>
          <button
            type="button"
            className="wl-evidence-add"
            onClick={() => setShowNote(true)}
          >
            <NotebookPen size={14} strokeWidth={2} aria-hidden />
            Add a note
            <span className="wl-evidence-optional">Optional</span>
          </button>
        </div>
      )}

      <footer className="wl-builder-foot">
        {items.length > 0 && problem ? (
          <p className="wl-builder-hint">{problem}</p>
        ) : (
          <p className="wl-lock-note">
            <Lock size={12} strokeWidth={2.25} aria-hidden />
            One per day · locked once added
          </p>
        )}
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy || Boolean(problem)}>
          {busy ? "Saving…" : "Add Commitment"}
        </Button>
      </footer>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  api,
  type EisenhowerCategory,
  type EventImportance,
  type EventUrgency,
  type WorkspaceEventType,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button, Drawer, inputClass, labelClass } from "@/components/ui";

const EVENT_TYPES: { value: WorkspaceEventType; label: string }[] = [
  { value: "MONITORING", label: "Monitoring" },
  { value: "COACHING", label: "Coaching" },
  { value: "DAILY_LOG", label: "Daily Log" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "REVIEW", label: "Review" },
  { value: "ACTION", label: "Action" },
  { value: "SUPPORT", label: "Support" },
  { value: "INTERVENTION", label: "Intervention" },
];

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function categoryFrom(
  urgency: EventUrgency,
  importance: EventImportance,
): EisenhowerCategory {
  if (urgency === "URGENT" && importance === "IMPORTANT") return "DO_FIRST";
  if (urgency === "URGENT" && importance === "NOT_IMPORTANT") return "DELEGATE";
  if (urgency === "NOT_URGENT" && importance === "IMPORTANT") return "SCHEDULE";
  return "ELIMINATE";
}

function quadrantLabel(category: EisenhowerCategory) {
  switch (category) {
    case "DO_FIRST":
      return "Do first";
    case "SCHEDULE":
      return "Schedule";
    case "DELEGATE":
      return "Delegate";
    case "ELIMINATE":
      return "Eliminate";
  }
}

type Props = {
  open: boolean;
  profileId: string;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
  defaultType?: WorkspaceEventType;
  /** After save, go to the SE Eisenhower board (default true). */
  redirectToEisenhower?: boolean;
};

export function AddEventDrawer({
  open,
  profileId,
  onClose,
  onCreated,
  defaultType = "MONITORING",
  redirectToEisenhower = true,
}: Props) {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WorkspaceEventType>(defaultType);
  const [urgency, setUrgency] = useState<EventUrgency>("NOT_URGENT");
  const [importance, setImportance] =
    useState<EventImportance>("IMPORTANT");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setTitle("");
    setType(defaultType);
    setUrgency("NOT_URGENT");
    setImportance("IMPORTANT");
    setNotes("");
    setNextAction("");
  }

  async function save() {
    if (!token || !title.trim()) {
      pushToast("Describe what happened", "error");
      return;
    }
    setBusy(true);
    try {
      const category = categoryFrom(urgency, importance);
      const matrixNotes = [
        `From ${type.replaceAll("_", " ").toLowerCase()} event`,
        notes.trim() || null,
        nextAction.trim() ? `Next action: ${nextAction.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      // Primary: land on the Eisenhower matrix
      await api.createEisenhowerTask(token, {
        salesExecutiveProfileId: profileId,
        month: currentMonthValue(),
        category,
        title: title.trim(),
        notes: matrixNotes || null,
        status: "OPEN",
      });

      // Secondary: timeline / linked records (Action, Feedback, etc.)
      try {
        await api.createWorkspaceEvent(token, {
          salesExecutiveProfileId: profileId,
          type,
          title: title.trim(),
          notes: notes.trim() || null,
          nextAction: nextAction.trim() || null,
          urgency,
          importance,
          status: "COMPLETED",
        });
      } catch {
        // Matrix already saved — timeline failure should not undo that
      }

      pushToast(`Saved to Eisenhower · ${quadrantLabel(category)}`, "success");
      reset();
      onClose();
      await onCreated?.();
      if (redirectToEisenhower) {
        router.push(`/profiles/${profileId}/eisenhower`);
      }
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Could not save to Eisenhower",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  const previewCategory = categoryFrom(urgency, importance);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add Event"
      description="Record what happened. Urgency and importance place it on the Eisenhower board."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save to Eisenhower"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="event-title">
            What happened?
          </label>
          <input
            id="event-title"
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary of the activity"
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="event-type">
            Event Type
          </label>
          <select
            id="event-type"
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as WorkspaceEventType)}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="event-urgency">
              Urgency
            </label>
            <select
              id="event-urgency"
              className={inputClass}
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as EventUrgency)}
            >
              <option value="NOT_URGENT">Not Urgent</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="event-importance">
              Importance
            </label>
            <select
              id="event-importance"
              className={inputClass}
              value={importance}
              onChange={(e) =>
                setImportance(e.target.value as EventImportance)
              }
            >
              <option value="IMPORTANT">Important</option>
              <option value="NOT_IMPORTANT">Not Important</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="event-notes">
            Notes
          </label>
          <textarea
            id="event-notes"
            className={`${inputClass} min-h-[5.5rem] resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context (optional)"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="event-next">
            Next Action
          </label>
          <input
            id="event-next"
            className={inputClass}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="What should happen next? (optional)"
          />
        </div>

        <p className="text-[12px] text-[var(--color-ink-subtle)]">
          Saving adds this to the Eisenhower matrix in{" "}
          <strong>{quadrantLabel(previewCategory)}</strong>
          {type === "ACTION"
            ? " and creates an Assignment"
            : type === "FEEDBACK"
              ? " and creates a Feedback record"
              : ""}
          .
        </p>
      </div>
    </Drawer>
  );
}

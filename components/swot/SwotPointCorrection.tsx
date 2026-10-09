"use client";

import { useState } from "react";
import { PencilLine, ShieldCheck } from "lucide-react";
import { Button, DateTimeCell } from "@/components/ui";
import type { SwotItem, SwotQuadrantName } from "@/lib/api";
import { personName } from "@/lib/labels";

export type SwotCorrectionRequest =
  | { kind: "add"; quadrant: SwotQuadrantName; text: string; reason?: string }
  | {
      kind: "edit";
      quadrant: SwotQuadrantName;
      pointId: string;
      text: string;
      reason?: string;
    }
  | {
      kind: "delete";
      quadrant: SwotQuadrantName;
      pointId: string;
      reason?: string;
    };

export type SwotCorrectionDraft =
  | { kind: "add"; quadrant: SwotQuadrantName }
  | { kind: "edit"; quadrant: SwotQuadrantName; pointId: string; text: string }
  | { kind: "delete"; quadrant: SwotQuadrantName; pointId: string; text: string };

/** Shown on a version a Super Admin corrected; the original author is unchanged. */
export function SwotCorrectionNote({
  swot,
}: {
  swot: Pick<SwotItem, "correctedAt" | "correctedBy" | "correctionReason">;
}) {
  if (!swot.correctedAt) return null;
  return (
    <div className="swot-corrected-note">
      <PencilLine size={16} strokeWidth={2} aria-hidden />
      <div>
        <p className="swot-corrected-title">Corrected by Super Admin</p>
        <p className="swot-corrected-body">
          {swot.correctedBy ? `${personName(swot.correctedBy)} · ` : null}
          <DateTimeCell value={swot.correctedAt} />
          {swot.correctionReason ? ` · Reason: ${swot.correctionReason}` : null}
        </p>
      </div>
    </div>
  );
}

/** Super Admin guidance above the board. */
export function SwotCorrectionNotice({ canCorrect }: { canCorrect: boolean }) {
  return (
    <div className="swot-correct-notice">
      <ShieldCheck size={16} strokeWidth={2} aria-hidden />
      <p>
        {canCorrect
          ? "As Super Admin you can add, edit or delete individual points. Changes are saved directly on this version; the original author and source stay the same, sharing is not changed, and every change is recorded in the audit log."
          : "This is an older version. Only the latest version of a SWOT can be corrected."}
      </p>
    </div>
  );
}

/** Inline Super Admin form for adding, editing or deleting one SWOT point. */
export function SwotPointCorrectionForm({
  draft,
  busy,
  onSubmit,
  onCancel,
}: {
  draft: SwotCorrectionDraft;
  busy: boolean;
  onSubmit: (request: SwotCorrectionRequest) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(draft.kind === "edit" ? draft.text : "");
  const [reason, setReason] = useState("");
  const isDelete = draft.kind === "delete";
  const trimmed = text.trim();
  const unchanged = draft.kind === "edit" && trimmed === draft.text.trim();
  const canSave = isDelete || (trimmed.length > 0 && !unchanged);
  const reasonValue = reason.trim() || undefined;

  function submit() {
    if (!canSave || busy) return;
    if (draft.kind === "delete") {
      onSubmit({
        kind: "delete",
        quadrant: draft.quadrant,
        pointId: draft.pointId,
        reason: reasonValue,
      });
    } else if (draft.kind === "edit") {
      onSubmit({
        kind: "edit",
        quadrant: draft.quadrant,
        pointId: draft.pointId,
        text: trimmed,
        reason: reasonValue,
      });
    } else {
      onSubmit({
        kind: "add",
        quadrant: draft.quadrant,
        text: trimmed,
        reason: reasonValue,
      });
    }
  }

  return (
    <form
      className={`swot-correct-form${isDelete ? " is-delete" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {isDelete ? (
        <>
          <p className="swot-correct-quote">{draft.text}</p>
          <p className="swot-correct-warn">
            Delete this {draft.quadrant} point? It is removed from this version
            and recorded in the audit log.
          </p>
        </>
      ) : (
        <label className="swot-correct-field">
          <span className="sr-only">
            {draft.kind === "add" ? `New ${draft.quadrant} point` : "Point text"}
          </span>
          <textarea
            className="swot-correct-input"
            rows={2}
            maxLength={2000}
            value={text}
            autoFocus
            placeholder={
              draft.kind === "add" ? `Describe the ${draft.quadrant}` : undefined
            }
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      )}
      <label className="swot-correct-field">
        <span className="swot-correct-label">Reason (optional)</span>
        <input
          className="swot-correct-input"
          maxLength={1000}
          value={reason}
          placeholder="Why is this correction needed?"
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <div className="swot-correct-actions">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={isDelete ? "danger" : "primary"}
          size="sm"
          disabled={busy || !canSave}
        >
          {busy
            ? "Saving…"
            : isDelete
              ? "Delete point"
              : draft.kind === "add"
                ? `Add ${draft.quadrant}`
                : "Save correction"}
        </Button>
      </div>
    </form>
  );
}

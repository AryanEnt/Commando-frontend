"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { SwotItem, SwotPoint } from "@/lib/api";
import { IconButton } from "@/components/ui";
import { SWOT_CATEGORIES, SwotQuadrant } from "@/components/swot/SwotQuadrant";
import {
  SwotPointCorrectionForm,
  type SwotCorrectionDraft,
  type SwotCorrectionRequest,
} from "@/components/swot/SwotPointCorrection";

export type SwotQuadrantKey =
  | "strength"
  | "weakness"
  | "opportunity"
  | "threat";

export const SWOT_QUADRANTS: Array<{
  key: SwotQuadrantKey;
  letter: string;
  title: string;
  hint: string;
  pointsKey:
    | "strengthPoints"
    | "weaknessPoints"
    | "opportunityPoints"
    | "threatPoints";
  flag:
    | "visibleStrength"
    | "visibleWeakness"
    | "visibleOpportunity"
    | "visibleThreat";
}> = [
  {
    key: "strength",
    letter: "S",
    title: "Strengths",
    hint: "What’s already working",
    pointsKey: "strengthPoints",
    flag: "visibleStrength",
  },
  {
    key: "weakness",
    letter: "W",
    title: "Weaknesses",
    hint: "Gaps holding results back",
    pointsKey: "weaknessPoints",
    flag: "visibleWeakness",
  },
  {
    key: "opportunity",
    letter: "O",
    title: "Opportunities",
    hint: "Openings to grow",
    pointsKey: "opportunityPoints",
    flag: "visibleOpportunity",
  },
  {
    key: "threat",
    letter: "T",
    title: "Threats",
    hint: "Risks to watch",
    pointsKey: "threatPoints",
    flag: "visibleThreat",
  },
];

function pointsFor(swot: SwotItem, q: (typeof SWOT_QUADRANTS)[number]) {
  const stored = swot[q.pointsKey];
  if (stored && stored.length > 0) return stored;
  const blob = swot[q.key];
  if (!blob?.trim()) return [];
  return [
    {
      id: `${q.key}-legacy`,
      text: blob,
      visible: Boolean(swot[q.flag]),
    } satisfies SwotPoint,
  ];
}

export function sharedPointCount(swot: SwotItem) {
  return SWOT_QUADRANTS.reduce((n, q) => {
    return n + pointsFor(swot, q).filter((p) => p.visible).length;
  }, 0);
}

export function sharedQuadrantCount(swot: SwotItem) {
  return SWOT_QUADRANTS.filter((q) =>
    pointsFor(swot, q).some((p) => p.visible),
  ).length;
}

type Props = {
  swot: SwotItem;
  canShare: boolean;
  isSe: boolean;
  /** Profile SWOT is shared with the Sales Executive and their Sales Support. */
  isProfile?: boolean;
  busyFlag?: SwotQuadrantKey | "all" | string | null;
  onTogglePoint?: (
    quadrant: SwotQuadrantKey,
    pointId: string,
    next: boolean,
  ) => void;
  onShareAll?: (share: boolean) => void;
  /** Super Admin point corrections; resolves true when saved. */
  onCorrect?: (request: SwotCorrectionRequest) => Promise<boolean>;
  correctionBusy?: boolean;
  /** "What the subject executive sees" bar above the grid. */
  showShareSummary?: boolean;
};

export function SwotQuadrantBoard({
  swot,
  canShare: canShareProp,
  isSe,
  isProfile = false,
  busyFlag = null,
  onTogglePoint,
  onShareAll,
  onCorrect,
  correctionBusy = false,
  showShareSummary = true,
}: Props) {
  const canShare = canShareProp;
  const canCorrect = Boolean(onCorrect);
  const [draft, setDraft] = useState<SwotCorrectionDraft | null>(null);

  async function submitCorrection(request: SwotCorrectionRequest) {
    if (!onCorrect) return;
    if (await onCorrect(request)) setDraft(null);
  }
  const audience = isProfile
    ? "the Sales Executive and Sales Support"
    : "the subject executive";
  const shared = sharedPointCount(swot);
  const total = SWOT_QUADRANTS.reduce(
    (n, q) => n + pointsFor(swot, q).length,
    0,
  );
  const allOn = total > 0 && shared === total;
  const own =
    swot.source === "SALES_EXECUTIVE" ||
    swot.source === "SALES_SUPPORT_EXECUTIVE";
  const showSharing = !own;

  return (
    <div className="swot-board">
      {showSharing && showShareSummary && (canShare || !isSe) ? (
        <div className="swot-share-bar">
          <div className="swot-share-copy">
            <p className="swot-share-kicker">
              <Sparkles size={14} aria-hidden />
              What {audience} {isProfile ? "see" : "sees"}
            </p>
            <p className="swot-share-title">
              {shared === 0
                ? "Nothing shared yet"
                : `${shared} of ${total} points shared`}
            </p>
            <p className="swot-share-hint">
              {canShare
                ? `Tick the points ${audience} should see. Team Lead and Commando always see every point.`
                : "Only the author of this assessment can change sharing. You can still see every point."}
            </p>
          </div>
          {canShare && onShareAll ? (
            <button
              type="button"
              className="swot-share-all"
              disabled={busyFlag !== null}
              onClick={() => onShareAll(!allOn)}
            >
              {allOn ? "Hold all back" : "Share all points"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="swotq-grid is-lg">
        {SWOT_QUADRANTS.map((q) => {
          const category = SWOT_CATEGORIES.find((c) => c.key === q.key)!;
          const points = pointsFor(swot, q);
          const visibleCount = points.filter((p) => p.visible).length;
          return (
            <SwotQuadrant
              key={q.key}
              size="lg"
              letter={category.letter}
              label={category.label}
              color={category.color}
              tint={category.tint}
              ring={category.ring}
              hint={
                isSe || !showSharing
                  ? q.hint
                  : `${visibleCount} of ${points.length} shared with SE`
              }
              empty={
                isSe && !own ? (
                  <>
                    <Lock size={14} strokeWidth={2} aria-hidden /> Held back for now
                  </>
                ) : (
                  "—"
                )
              }
              footer={
                !canCorrect ? undefined : draft?.kind === "add" &&
                  draft.quadrant === q.key ? (
                  <SwotPointCorrectionForm
                    draft={draft}
                    busy={correctionBusy}
                    onSubmit={(request) => void submitCorrection(request)}
                    onCancel={() => setDraft(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className="swot-correct-add"
                    disabled={correctionBusy}
                    onClick={() => setDraft({ kind: "add", quadrant: q.key })}
                  >
                    <Plus size={14} strokeWidth={2.2} aria-hidden />
                    Add {q.key}
                  </button>
                )
              }
              items={points.map((point, index) => {
                const active =
                  draft && draft.kind !== "add" && draft.pointId === point.id
                    ? draft
                    : null;
                const correctionControls =
                  canCorrect && !active ? (
                    <span className="swot-correct-tools">
                      <IconButton
                        size="sm"
                        label={`Edit ${q.title} point ${index + 1}`}
                        disabled={correctionBusy}
                        onClick={() =>
                          setDraft({
                            kind: "edit",
                            quadrant: q.key,
                            pointId: point.id,
                            text: point.text,
                          })
                        }
                      >
                        <Pencil size={14} strokeWidth={2} aria-hidden />
                      </IconButton>
                      <IconButton
                        size="sm"
                        label={`Delete ${q.title} point ${index + 1}`}
                        disabled={correctionBusy}
                        onClick={() =>
                          setDraft({
                            kind: "delete",
                            quadrant: q.key,
                            pointId: point.id,
                            text: point.text,
                          })
                        }
                      >
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                      </IconButton>
                    </span>
                  ) : null;
                const shareControl =
                  canShare && onTogglePoint ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={point.visible}
                      aria-label={`${point.visible ? "Hide" : "Share"} ${q.title} point ${index + 1}`}
                      className={`swot-q-switch${point.visible ? " is-on" : ""}`}
                      disabled={busyFlag === point.id || busyFlag === "all"}
                      onClick={() =>
                        onTogglePoint(q.key, point.id, !point.visible)
                      }
                    >
                      {point.visible ? (
                        <Eye size={14} strokeWidth={2.2} aria-hidden />
                      ) : (
                        <EyeOff size={14} strokeWidth={2.2} aria-hidden />
                      )}
                      <span>{point.visible ? "SE" : "Private"}</span>
                    </button>
                  ) : !isSe && showSharing ? (
                    <span
                      className={`swot-q-chip${point.visible ? " is-on" : ""}`}
                    >
                      {point.visible ? "SE can see" : "Held back"}
                    </span>
                  ) : null;
                return {
                  id: point.id,
                  text: point.text,
                  content: active ? (
                    <SwotPointCorrectionForm
                      key={`${active.kind}-${point.id}`}
                      draft={active}
                      busy={correctionBusy}
                      onSubmit={(request) => void submitCorrection(request)}
                      onCancel={() => setDraft(null)}
                    />
                  ) : undefined,
                  trailing:
                    active || (!shareControl && !correctionControls) ? undefined : (
                      <>
                        {shareControl}
                        {correctionControls}
                      </>
                    ),
                };
              })}
            />
          );
        })}
      </div>
    </div>
  );
}

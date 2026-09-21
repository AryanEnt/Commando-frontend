"use client";

import { Eye, EyeOff, Lock, Sparkles } from "lucide-react";
import type { SwotItem, SwotPoint } from "@/lib/api";

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
  tone: string;
  badge: string;
}> = [
  {
    key: "strength",
    letter: "S",
    title: "Strengths",
    hint: "What’s already working",
    pointsKey: "strengthPoints",
    flag: "visibleStrength",
    tone: "swot-q is-s",
    badge: "swot-q-letter is-s",
  },
  {
    key: "weakness",
    letter: "W",
    title: "Weaknesses",
    hint: "Gaps holding results back",
    pointsKey: "weaknessPoints",
    flag: "visibleWeakness",
    tone: "swot-q is-w",
    badge: "swot-q-letter is-w",
  },
  {
    key: "opportunity",
    letter: "O",
    title: "Opportunities",
    hint: "Openings to grow",
    pointsKey: "opportunityPoints",
    flag: "visibleOpportunity",
    tone: "swot-q is-o",
    badge: "swot-q-letter is-o",
  },
  {
    key: "threat",
    letter: "T",
    title: "Threats",
    hint: "Risks to watch",
    pointsKey: "threatPoints",
    flag: "visibleThreat",
    tone: "swot-q is-t",
    badge: "swot-q-letter is-t",
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
  busyFlag?: SwotQuadrantKey | "all" | string | null;
  onTogglePoint?: (
    quadrant: SwotQuadrantKey,
    pointId: string,
    next: boolean,
  ) => void;
  onShareAll?: (share: boolean) => void;
};

export function SwotQuadrantBoard({
  swot,
  canShare,
  isSe,
  busyFlag = null,
  onTogglePoint,
  onShareAll,
}: Props) {
  const shared = sharedPointCount(swot);
  const total = SWOT_QUADRANTS.reduce(
    (n, q) => n + pointsFor(swot, q).length,
    0,
  );
  const allOn = total > 0 && shared === total;
  const own = swot.source === "SALES_EXECUTIVE";

  return (
    <div className="swot-board">
      {!own && (canShare || !isSe) ? (
        <div className="swot-share-bar">
          <div className="swot-share-copy">
            <p className="swot-share-kicker">
              <Sparkles size={14} aria-hidden />
              What the Sales Executive sees
            </p>
            <p className="swot-share-title">
              {shared === 0
                ? "Nothing shared yet"
                : `${shared} of ${total} points shared`}
            </p>
            <p className="swot-share-hint">
              {canShare
                ? "Tick the points the Sales Executive should see. Team Lead and Commando always see every point."
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

      <div className="swot-q-grid">
        {SWOT_QUADRANTS.map((q) => {
          const points = pointsFor(swot, q);
          const visibleCount = points.filter((p) => p.visible).length;
          return (
            <article key={q.key} className={q.tone}>
              <header className="swot-q-head">
                <span className={q.badge}>{q.letter}</span>
                <div className="min-w-0">
                  <h2 className="swot-q-title">{q.title}</h2>
                  <p className="swot-q-hint">
                    {isSe
                      ? q.hint
                      : `${visibleCount} of ${points.length} shared with SE`}
                  </p>
                </div>
              </header>
              {points.length === 0 ? (
                isSe && !own ? (
                  <div className="swot-q-held">
                    <Lock size={16} strokeWidth={1.8} aria-hidden />
                    <p>Held back for now</p>
                  </div>
                ) : (
                  <p className="swot-q-body">—</p>
                )
              ) : (
                <ol className="swot-point-list">
                  {points.map((point, index) => {
                    const busy =
                      busyFlag === point.id || busyFlag === "all";
                    return (
                      <li key={point.id} className="swot-point-row">
                        <span className="swot-point-num">{index + 1}</span>
                        <p className="swot-point-text">{point.text}</p>
                        {canShare && onTogglePoint ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={point.visible}
                            aria-label={`${point.visible ? "Hide" : "Share"} ${q.title} point ${index + 1}`}
                            className={`swot-q-switch${point.visible ? " is-on" : ""}`}
                            disabled={busy}
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
                        ) : !isSe && !own ? (
                          <span
                            className={`swot-q-chip${point.visible ? " is-on" : ""}`}
                          >
                            {point.visible ? "SE can see" : "Held back"}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

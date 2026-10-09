"use client";

import type { CSSProperties, ReactNode } from "react";

export type SwotCategoryKey = "strength" | "weakness" | "opportunity" | "threat";

type PointsKey =
  | "strengthPoints"
  | "weaknessPoints"
  | "opportunityPoints"
  | "threatPoints";

export type SwotCategory = {
  key: SwotCategoryKey;
  letter: string;
  label: string;
  color: string;
  tint: string;
  ring: string;
  pointsKey: PointsKey;
};

/** Fixed category → colour mapping used everywhere SWOT content is shown. */
export const SWOT_CATEGORIES: readonly SwotCategory[] = [
  {
    key: "strength",
    letter: "S",
    label: "Strengths",
    color: "var(--swot-s)",
    tint: "var(--swot-s-bg)",
    ring: "var(--swot-s-ring)",
    pointsKey: "strengthPoints",
  },
  {
    key: "weakness",
    letter: "W",
    label: "Weaknesses",
    color: "var(--swot-w)",
    tint: "var(--swot-w-bg)",
    ring: "var(--swot-w-ring)",
    pointsKey: "weaknessPoints",
  },
  {
    key: "opportunity",
    letter: "O",
    label: "Opportunities",
    color: "var(--swot-o)",
    tint: "var(--swot-o-bg)",
    ring: "var(--swot-o-ring)",
    pointsKey: "opportunityPoints",
  },
  {
    key: "threat",
    letter: "T",
    label: "Threats",
    color: "var(--swot-t)",
    tint: "var(--swot-t-bg)",
    ring: "var(--swot-t-ring)",
    pointsKey: "threatPoints",
  },
];

export type SwotQuadrantItem = {
  id: string;
  text: string;
  /** Replaces the plain text (e.g. an inline edit form). */
  content?: ReactNode;
  /** Optional control rendered at the end of the row (e.g. share switch). */
  trailing?: ReactNode;
};

export function SwotQuadrant({
  letter,
  label,
  color,
  tint,
  ring,
  items,
  hint,
  empty = "—",
  size = "md",
  footer,
}: {
  letter: string;
  label: string;
  color: string;
  tint: string;
  ring?: string;
  items: SwotQuadrantItem[];
  hint?: ReactNode;
  /** Shown instead of the list when there are no items. */
  empty?: ReactNode;
  size?: "md" | "lg";
  /** Rendered under the list (e.g. an "Add point" action). */
  footer?: ReactNode;
}) {
  const style = {
    "--q-color": color,
    "--q-tint": tint,
    "--q-ring": ring ?? tint,
  } as CSSProperties;
  return (
    <section
      className={`swotq${size === "lg" ? " is-lg" : ""}`}
      style={style}
      aria-label={label}
    >
      <header className="swotq-head">
        <span className="swotq-letter" aria-hidden>
          {letter}
        </span>
        <h3 className="swotq-label">{label}</h3>
        {hint ? <span className="swotq-hint">{hint}</span> : null}
      </header>
      {items.length === 0 ? (
        <div className="swotq-empty">{empty}</div>
      ) : (
        <ul className="swotq-list">
          {items.map((item) => (
            <li key={item.id} className="swotq-item">
              {item.content ?? (
                <span className="swotq-item-text">{item.text}</span>
              )}
              {item.trailing}
            </li>
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}

type SwotPointLike = { id: string; text: string; visible?: boolean };

/** Any SWOT-shaped record: point arrays and/or legacy text blobs. */
export type SwotLike = Partial<Record<PointsKey, SwotPointLike[] | undefined>> &
  Partial<Record<SwotCategoryKey, string | null | undefined>>;

export function swotCategoryPoints(
  swot: SwotLike,
  category: SwotCategory,
): SwotPointLike[] {
  const stored = swot[category.pointsKey];
  if (stored && stored.length > 0) return stored;
  const blob = swot[category.key]?.trim();
  if (!blob) return [];
  return blob
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(/^\s*[-*•]\s*/, "")
        .trim(),
    )
    .filter(Boolean)
    .map((text, i) => ({ id: `${category.key}-${i}`, text }));
}

/** The 2×2 S/W/O/T grid built from one SWOT record. */
export function SwotQuadrantGrid({
  swot,
  empty,
  size = "md",
  hintFor,
  trailingFor,
}: {
  swot: SwotLike;
  empty?: ReactNode;
  size?: "md" | "lg";
  hintFor?: (category: SwotCategory, points: SwotPointLike[]) => ReactNode;
  trailingFor?: (
    category: SwotCategory,
    point: SwotPointLike,
    index: number,
  ) => ReactNode;
}) {
  return (
    <div className={`swotq-grid${size === "lg" ? " is-lg" : ""}`}>
      {SWOT_CATEGORIES.map((category) => {
        const points = swotCategoryPoints(swot, category);
        return (
          <SwotQuadrant
            key={category.key}
            letter={category.letter}
            label={category.label}
            color={category.color}
            tint={category.tint}
            ring={category.ring}
            size={size}
            hint={hintFor?.(category, points)}
            empty={empty}
            items={points.map((p, i) => ({
              id: p.id,
              text: p.text,
              trailing: trailingFor?.(category, p, i),
            }))}
          />
        );
      })}
    </div>
  );
}

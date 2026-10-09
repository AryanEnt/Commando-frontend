"use client";

import { useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { SwotPointDraft } from "@/lib/swot-points";
import { newSwotPointKey } from "@/lib/swot-points";

export type SwotTone = "strength" | "weakness" | "opportunity" | "threat";

const TONE_ICON: Record<SwotTone, LucideIcon> = {
  strength: Sparkles,
  weakness: Target,
  opportunity: TrendingUp,
  threat: ShieldAlert,
};

const TONE_SINGULAR: Record<SwotTone, string> = {
  strength: "Strength",
  weakness: "Weakness",
  opportunity: "Opportunity",
  threat: "Threat",
};

type Props = {
  label: string;
  tone: SwotTone;
  hint?: string;
  points: SwotPointDraft[];
  onChange: (next: SwotPointDraft[]) => void;
  showVisibility: boolean;
  /** First name of the person the SWOT is about, used in share labels. */
  subjectName?: string;
};

export function SwotPointsEditor({
  label,
  tone,
  hint,
  points,
  onChange,
  showVisibility,
  subjectName,
}: Props) {
  const Icon = TONE_ICON[tone];
  const singular = TONE_SINGULAR[tone];
  const shareTarget = subjectName?.trim() || "the executive";
  const filled = points.filter((p) => p.text.trim()).length;
  const shared = points.filter((p) => p.text.trim() && p.visible).length;
  const allShared = filled > 0 && shared === filled;

  const pendingFocusKey = useRef<string | null>(null);
  const inputRefs = useRef(new Map<string, HTMLTextAreaElement>());

  useEffect(() => {
    const key = pendingFocusKey.current;
    if (!key) return;
    inputRefs.current.get(key)?.focus();
    pendingFocusKey.current = null;
  }, [points]);

  function update(index: number, patch: Partial<SwotPointDraft>) {
    onChange(points.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPoint() {
    const key = newSwotPointKey();
    pendingFocusKey.current = key;
    onChange([...points, { key, text: "", visible: false }]);
  }

  return (
    <section className={`swot-card swot-card--${tone}`}>
      <header className="swot-card-head">
        <span className="swot-card-icon" aria-hidden>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="swot-card-title">{label}</h2>
          {hint ? <p className="swot-card-hint">{hint}</p> : null}
        </div>
        <div className="swot-card-meta">
          <span className="swot-card-count">
            {filled} {filled === 1 ? "point" : "points"}
          </span>
          {showVisibility && filled > 0 ? (
            <button
              type="button"
              className="swot-card-share-all"
              onClick={() =>
                onChange(
                  points.map((p) => ({
                    ...p,
                    visible: p.text.trim() ? !allShared : p.visible,
                  })),
                )
              }
            >
              {allShared ? "Make all private" : "Share all"}
            </button>
          ) : null}
        </div>
      </header>

      <ol className="swot-card-list">
        {points.map((point, index) => (
          <li key={point.key} className="swot-point">
            <span className="swot-point-num" aria-hidden>
              {index + 1}
            </span>
            <div className="swot-point-body">
              <textarea
                ref={(el) => {
                  if (el) inputRefs.current.set(point.key, el);
                  else inputRefs.current.delete(point.key);
                }}
                required
                rows={2}
                className="swot-point-input"
                value={point.text}
                aria-label={`${singular} ${index + 1}`}
                placeholder={`Describe ${singular.toLowerCase()} ${index + 1}…`}
                onChange={(e) => update(index, { text: e.target.value })}
              />
              <div className="swot-point-actions">
                {showVisibility ? (
                  <button
                    type="button"
                    className={`swot-share${point.visible ? " is-on" : ""}`}
                    aria-pressed={point.visible}
                    title={
                      point.visible
                        ? `${shareTarget} can see this point`
                        : `Only you and your team can see this point`
                    }
                    onClick={() => update(index, { visible: !point.visible })}
                  >
                    {point.visible ? (
                      <Eye size={13} strokeWidth={2.2} aria-hidden />
                    ) : (
                      <EyeOff size={13} strokeWidth={2.2} aria-hidden />
                    )}
                    {point.visible
                      ? `Shared with ${shareTarget}`
                      : `Share with ${shareTarget}`}
                  </button>
                ) : (
                  <span />
                )}
                {points.length > 1 ? (
                  <button
                    type="button"
                    className="swot-point-remove"
                    aria-label={`Remove ${singular.toLowerCase()} ${index + 1}`}
                    onClick={() =>
                      onChange(points.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 size={13} strokeWidth={2} aria-hidden />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <button type="button" className="swot-card-add" onClick={addPoint}>
        <Plus size={14} strokeWidth={2.4} aria-hidden />
        Add {singular.toLowerCase()}
      </button>
    </section>
  );
}

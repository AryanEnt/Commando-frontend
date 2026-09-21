"use client";

import { Plus, Trash2 } from "lucide-react";
import type { SwotPointDraft } from "@/lib/swot-points";
import { newSwotPointKey } from "@/lib/swot-points";

type Props = {
  label: string;
  hint?: string;
  points: SwotPointDraft[];
  onChange: (next: SwotPointDraft[]) => void;
  showVisibility: boolean;
};

export function SwotPointsEditor({
  label,
  hint,
  points,
  onChange,
  showVisibility,
}: Props) {
  function update(index: number, patch: Partial<SwotPointDraft>) {
    onChange(
      points.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  return (
    <fieldset className="swot-editor">
      <legend className="swot-editor-legend">{label}</legend>
      {hint ? <p className="swot-editor-hint">{hint}</p> : null}
      <ol className="swot-editor-list">
        {points.map((point, index) => (
          <li key={point.key} className="swot-editor-row">
            <span className="swot-editor-num" aria-hidden>
              {index + 1}
            </span>
            <textarea
              required
              rows={2}
              className="swot-editor-input"
              value={point.text}
              placeholder={`${label.replace(/s$/, "")} ${index + 1}`}
              onChange={(e) => update(index, { text: e.target.value })}
            />
            <div className="swot-editor-side">
              {showVisibility ? (
                <label className="swot-editor-check">
                  <input
                    type="checkbox"
                    checked={point.visible}
                    onChange={(e) =>
                      update(index, { visible: e.target.checked })
                    }
                  />
                  Show to SE
                </label>
              ) : null}
              {points.length > 1 ? (
                <button
                  type="button"
                  className="swot-editor-remove"
                  aria-label={`Remove ${label} ${index + 1}`}
                  onClick={() =>
                    onChange(points.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={14} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="swot-editor-add"
        onClick={() =>
          onChange([
            ...points,
            { key: newSwotPointKey(), text: "", visible: false },
          ])
        }
      >
        <Plus size={14} strokeWidth={2.2} aria-hidden />
        Add point
      </button>
    </fieldset>
  );
}

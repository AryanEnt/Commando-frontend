"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CheckSquare,
  ClipboardList,
  Eye,
  Grid2X2,
  LayoutGrid,
  MessageSquare,
  Search,
} from "lucide-react";
import type { ContextSection } from "./weekly-review-types";

export type EvidenceNavItem = {
  id: ContextSection;
  label: string;
  count: number | null;
  attention?: boolean;
  attentionCount?: number;
};

const ICONS: Record<ContextSection, LucideIcon> = {
  overview: LayoutGrid,
  logs: ClipboardList,
  monitoring: Eye,
  assignments: CheckSquare,
  feedback: MessageSquare,
  swot: Grid2X2,
  eisenhower: Activity,
};

export function EvidenceSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="wr-evidence-search">
      <Search
        size={13}
        strokeWidth={2}
        aria-hidden
        className="wr-evidence-search-icon"
      />
      <span className="sr-only">Search evidence</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Compact 2-column evidence selector — navigation only, not content. */
export function EvidenceNavigator({
  items,
  activeId,
  onSelect,
}: {
  items: EvidenceNavItem[];
  activeId: ContextSection;
  onSelect: (id: ContextSection) => void;
}) {
  return (
    <nav className="wr-evidence-grid" aria-label="Week evidence">
      {items.map((item) => {
        const Icon = ICONS[item.id];
        const active = activeId === item.id;
        const count =
          item.attentionCount != null
            ? item.attentionCount
            : item.count != null && item.count > 0
              ? item.count
              : null;
        return (
          <button
            key={item.id}
            type="button"
            data-kind={item.id}
            className={`wr-evidence-tile${active ? " is-active" : ""}`}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(item.id)}
          >
            <span className="wr-evidence-tile-top">
              <span className="wr-evidence-tile-leading">
                <Icon
                  size={13}
                  strokeWidth={1.75}
                  aria-hidden
                  className="wr-evidence-tile-icon"
                />
                {item.attention ? (
                  <span
                    className="wr-evidence-attention"
                    title="Needs attention"
                  />
                ) : null}
              </span>
              <span className="wr-evidence-tile-count">
                {count != null ? count : "—"}
              </span>
            </span>
            <span className="wr-evidence-tile-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function EvidenceEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="wr-evidence-empty">
      <p className="wr-evidence-empty-title">{title}</p>
      <p className="wr-evidence-empty-desc">{description}</p>
    </div>
  );
}

export function sectionTitle(section: ContextSection): string {
  switch (section) {
    case "overview":
      return "Overview";
    case "logs":
      return "Daily Logs";
    case "monitoring":
      return "Monitoring";
    case "assignments":
      return "Assignments";
    case "feedback":
      return "Feedback";
    case "swot":
      return "SWOT";
    case "eisenhower":
      return "Eisenhower";
  }
}

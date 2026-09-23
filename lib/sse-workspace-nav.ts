/**
 * Manager-facing Sales Support workspace navigation (TL / Commando).
 * Mirrors SE workspace sections and grouping; routes under /support/[userId].
 */

import {
  seGroupedNavForRole,
  seSectionLabel as seLabel,
  type SeNavGroup,
  type SeNavItem,
  type SeSection,
} from "@/lib/se-workspace-nav";

export type SseSection = SeSection;

export type SseNavItem = Omit<SeNavItem, "href"> & {
  href: (userId: string) => string;
};

export type SseNavGroup = Omit<SeNavGroup, "items"> & {
  items: SseNavItem[];
};

const PATH_SECTIONS: SseSection[] = [
  "coaching",
  "work-log",
  "checklist",
  "monitoring",
  "reviews",
  "eisenhower",
  "actions",
  "support",
  "interventions",
  "feedback",
  "performance",
  "history",
  "swot",
  "verdict",
  "timeline",
];

/** Sections with working Support-user backends today. */
export const SSE_LIVE_SECTIONS: ReadonlySet<SseSection> = new Set([
  "overview",
  "swot",
  "work-log",
  "coaching",
  "feedback",
  "support",
  "actions",
  "history",
  "timeline",
  "monitoring",
  "checklist",
  "reviews",
]);

export function sseWorkspaceHref(userId: string, section?: SseSection) {
  if (!section || section === "overview") return `/support/${userId}`;
  return `/support/${userId}/${section}`;
}

export function sseSwotCreateHref(userId: string) {
  const returnTo = encodeURIComponent(sseWorkspaceHref(userId, "swot"));
  return `/swot/new?subjectUserId=${encodeURIComponent(userId)}&returnTo=${returnTo}`;
}

export function sseDailyLogHref(userId: string, logId: string) {
  return `/support/${userId}/daily-logs/${logId}`;
}

export function sseCreateHref(
  userId: string,
  kind: "daily-log" | "feedback" | "swot" | "monitoring" | "weekly-review",
) {
  switch (kind) {
    case "daily-log":
      return `/support/${userId}/coaching/new`;
    case "feedback":
      return `/support/${userId}/feedback/new`;
    case "swot":
      return sseSwotCreateHref(userId);
    case "monitoring":
      return `/support/${userId}/monitoring/new`;
    case "weekly-review":
      return `/support/${userId}/reviews/new`;
  }
}

export function sseRosterHref() {
  return "/support";
}

export function sseSectionFromPathname(pathname: string): SseSection {
  const match = pathname.match(/^\/support\/[^/]+(?:\/([^/]+))?/);
  const segment = match?.[1];
  if (!segment) return "overview";
  if (segment === "daily-logs") return "coaching";
  if (PATH_SECTIONS.includes(segment as SseSection)) {
    return segment as SseSection;
  }
  return "overview";
}

export function sseSectionLabel(section: SseSection): string {
  if (section === "support") return "Linked SEs";
  if (section === "actions") return "Tasks";
  return seLabel(section);
}

/** Hidden from Support workspace until Support performance is built. */
const SSE_HIDDEN_SECTIONS: ReadonlySet<SseSection> = new Set([
  "performance",
  "verdict",
]);

function remapItem(item: SeNavItem): SseNavItem {
  const label =
    item.section === "support"
      ? "Linked SEs"
      : item.section === "actions"
        ? "Tasks"
        : item.label;
  return {
    ...item,
    label,
    href: (userId: string) => sseWorkspaceHref(userId, item.section),
  };
}

/** Same grouped sidebar as SE for TL / Commando / Super Admin (minus deferred sections). */
export function sseGroupedNavForRole(roleCode: string): SseNavGroup[] {
  return seGroupedNavForRole(roleCode)
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !SSE_HIDDEN_SECTIONS.has(item.section))
        .map(remapItem),
    }))
    .filter((group) => group.items.length > 0);
}

export function sseFlatNavForRole(roleCode: string): SseNavItem[] {
  return sseGroupedNavForRole(roleCode).flatMap((g) => g.items);
}

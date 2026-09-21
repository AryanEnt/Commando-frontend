import type { WorkspaceEvent, WorkspaceEventType } from "@/lib/api";
import type { SeSection } from "@/lib/se-workspace-nav";

const STORAGE_PREFIX = "commando.seNavSeen.v1";

export type SeAlertCounts = Partial<Record<SeSection, number>>;

export function seAlertStorageKey(userId: string) {
  return `${STORAGE_PREFIX}.${userId}`;
}

export function readSeNavSeen(userId: string): Partial<Record<SeSection, number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(seAlertStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed;
  } catch {
    return {};
  }
}

export function writeSeNavSeen(
  userId: string,
  seen: Partial<Record<SeSection, number>>,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(seAlertStorageKey(userId), JSON.stringify(seen));
}

export function markSeNavSectionSeen(userId: string, section: SeSection, at = Date.now()) {
  const seen = readSeNavSeen(userId);
  seen[section] = Math.max(seen[section] ?? 0, at);
  writeSeNavSeen(userId, seen);
  return seen;
}

/** Map a workspace activity row onto the SE sidebar item it belongs to. */
export function seSectionForWorkspaceEvent(
  type: WorkspaceEventType,
): SeSection | null {
  switch (type) {
    case "ACTION":
      return "actions";
    case "REVIEW":
      return "reviews";
    case "FEEDBACK":
      return "feedback";
    case "SUPPORT":
      return "support";
    case "INTERVENTION":
      return "overview";
    case "SWOT":
    case "DAILY_LOG":
    case "MONITORING":
    case "COACHING":
    case "GENERAL":
      return "timeline";
    default:
      return "timeline";
  }
}

export function eventTimestampMs(event: Pick<WorkspaceEvent, "occurredAt" | "createdAt">) {
  const t = Date.parse(event.occurredAt || event.createdAt);
  return Number.isFinite(t) ? t : 0;
}

export function markAllSeNavSectionsSeen(
  userId: string,
  sections: SeSection[],
  at = Date.now(),
) {
  const seen = readSeNavSeen(userId);
  for (const section of sections) {
    seen[section] = Math.max(seen[section] ?? 0, at);
  }
  writeSeNavSeen(userId, seen);
  return seen;
}

export type SeNavAlertItem = {
  id: string;
  section: SeSection;
  /** Dropdown category when it is not an SE workspace section. */
  kind?: string;
  title: string;
  at: number;
  href: string;
  createdById?: string | null;
};

const INBOX_SEEN_PREFIX = "commando.inboxSeen.v1";

export function inboxSeenStorageKey(userId: string) {
  return `${INBOX_SEEN_PREFIX}.${userId}`;
}

export function readInboxSeenIds(userId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(inboxSeenStorageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function writeInboxSeenIds(userId: string, seen: Record<string, number>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(inboxSeenStorageKey(userId), JSON.stringify(seen));
}

export function markInboxItemsSeen(
  userId: string,
  ids: string[],
  at = Date.now(),
) {
  const seen = readInboxSeenIds(userId);
  for (const id of ids) {
    seen[id] = Math.max(seen[id] ?? 0, at);
  }
  writeInboxSeenIds(userId, seen);
  return seen;
}

export function filterUnseenInboxItems(
  items: SeNavAlertItem[],
  seen: Record<string, number>,
) {
  return items.filter((item) => item.at > (seen[item.id] ?? 0));
}

const PATH_INBOX_PREFIX: Record<string, string> = {
  referrals: "referral",
  "action-items": "action",
  "weekly-reviews": "review",
  "my-tasks": "task",
  feedback: "feedback",
  assignments: "assignment",
  "audit-logs": "audit",
};

export function inboxSeenIdFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [kind, id] = parts;
  if (!id || id === "new") return null;
  const prefix = PATH_INBOX_PREFIX[kind];
  if (!prefix) return null;
  return `${prefix}-${id}`;
}

type ExtraHit = {
  id?: string;
  section: SeSection;
  at: number;
  createdById?: string | null;
  title?: string;
  href?: string;
};

/**
 * Count unseen items per SE sidebar section.
 * Events the SE created themselves do not notify.
 */
export function seNavAlertCounts(input: {
  viewerId: string;
  events: WorkspaceEvent[];
  seen: Partial<Record<SeSection, number>>;
  extras?: ExtraHit[];
}): SeAlertCounts {
  const buckets: Partial<Record<SeSection, number>> = {};

  function bump(section: SeSection, at: number, createdById?: string | null) {
    if (createdById && createdById === input.viewerId) return;
    if (!at) return;
    const seenAt = input.seen[section] ?? 0;
    if (at <= seenAt) return;
    buckets[section] = (buckets[section] ?? 0) + 1;
  }

  for (const event of input.events) {
    const section = seSectionForWorkspaceEvent(event.type);
    if (!section) continue;
    bump(section, eventTimestampMs(event), event.createdById);
  }

  for (const extra of input.extras ?? []) {
    bump(extra.section, extra.at, extra.createdById);
  }

  return buckets;
}

export function buildSeNavAlertItems(input: {
  viewerId: string;
  profileId: string;
  events: WorkspaceEvent[];
  seen: Partial<Record<SeSection, number>>;
  extras?: ExtraHit[];
}): SeNavAlertItem[] {
  const items: SeNavAlertItem[] = [];

  function include(
    item: SeNavAlertItem,
  ) {
    if (item.createdById && item.createdById === input.viewerId) return;
    if (!item.at) return;
    const seenAt = input.seen[item.section] ?? 0;
    if (item.at <= seenAt) return;
    items.push(item);
  }

  for (const event of input.events) {
    const section = seSectionForWorkspaceEvent(event.type);
    if (!section) continue;
    include({
      id: event.id,
      section,
      title: event.title,
      at: eventTimestampMs(event),
      href:
        event.href ||
        `/profiles/${input.profileId}${section === "overview" ? "" : `/${section}`}`,
      createdById: event.createdById,
    });
  }

  for (const extra of input.extras ?? []) {
    include({
      id: extra.id ?? `${extra.section}-${extra.at}`,
      section: extra.section,
      title: extra.title ?? "New update",
      at: extra.at,
      href:
        extra.href ??
        `/profiles/${input.profileId}${extra.section === "overview" ? "" : `/${extra.section}`}`,
      createdById: extra.createdById,
    });
  }

  return items.sort((a, b) => b.at - a.at).slice(0, 12);
}

export function sortInboxItems(items: SeNavAlertItem[], limit = 12) {
  return [...items].sort((a, b) => b.at - a.at).slice(0, limit);
}

export function formatSeAlertCount(count: number) {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}

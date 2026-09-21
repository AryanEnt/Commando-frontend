"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { RoleCode } from "@/lib/navigation";
import { seSectionFromPathname, type SeSection } from "@/lib/se-workspace-nav";
import { seSectionFromRelatedPathname } from "@/lib/se-workspace-persist";
import {
  buildSeNavAlertItems,
  filterUnseenInboxItems,
  inboxSeenIdFromPathname,
  markAllSeNavSectionsSeen,
  markInboxItemsSeen,
  markSeNavSectionSeen,
  readInboxSeenIds,
  readSeNavSeen,
  seNavAlertCounts,
  sortInboxItems,
  type SeAlertCounts,
  type SeNavAlertItem,
} from "@/lib/se-nav-alerts";

function parseAt(value: string | null | undefined) {
  if (!value) return 0;
  const at = Date.parse(value);
  return Number.isFinite(at) ? at : 0;
}

async function loadRoleInboxItems(opts: {
  token: string;
  userId: string;
  roleCode: RoleCode | string | null;
  profileId: string | null;
}): Promise<{ counts: SeAlertCounts; items: SeNavAlertItem[] }> {
  const { token, userId, roleCode, profileId } = opts;
  const inboxSeen = readInboxSeenIds(userId);

  if (roleCode === "SALES_EXECUTIVE") {
    if (!profileId) return { counts: {}, items: [] };
    const [eventsRes, eisenhowerRes, metricsRes] = await Promise.all([
      api.getWorkspaceEvents(token, { profileId, pageSize: 80, range: "all" }),
      api
        .getEisenhowerTasks(token, { profileId, pageSize: 40 })
        .catch(() => null),
      api.getPerformanceMetrics(token, profileId).catch(() => null),
    ]);

    const extras = [
      ...(eisenhowerRes?.data.tasks ?? []).map((t) => ({
        id: `eisenhower-${t.id}`,
        section: "eisenhower" as const,
        at: Date.parse(t.createdAt),
        createdById: t.createdById,
        title: t.title,
        href: `/eisenhower/${t.id}`,
      })),
      ...(metricsRes?.data.metrics.currentCommandoScore.visible &&
      metricsRes.data.metrics.currentCommandoScore.evaluatedAt
        ? [
            {
              id: `perf-commando-${metricsRes.data.metrics.currentCommandoScore.evaluationId}`,
              section: "performance" as const,
              at: Date.parse(
                metricsRes.data.metrics.currentCommandoScore.evaluatedAt,
              ),
              createdById: null as string | null,
              title: "New Commando performance score",
              href: `/profiles/${profileId}/performance`,
            },
          ]
        : []),
      ...(metricsRes?.data.metrics.teamLeadPerformance
        ? [
            {
              id: `perf-tl-${metricsRes.data.metrics.teamLeadPerformance.evaluationId}`,
              section: "performance" as const,
              at: Date.parse(
                metricsRes.data.metrics.teamLeadPerformance.evaluatedAt,
              ),
              createdById: null as string | null,
              title: "New Team Lead performance update",
              href: `/profiles/${profileId}/performance`,
            },
          ]
        : []),
    ].filter((x) => Number.isFinite(x.at));

    const seen = readSeNavSeen(userId);
    const payload = {
      viewerId: userId,
      events: eventsRes.data.events,
      seen,
      extras,
    };
    return {
      counts: seNavAlertCounts(payload),
      items: filterUnseenInboxItems(
        buildSeNavAlertItems({ ...payload, profileId }),
        inboxSeen,
      ),
    };
  }

  const settled = await Promise.allSettled([
    api.getActionItems(token, { view: "active", pageSize: 30 }),
    api.getReferrals(token, { pageSize: 30 }),
    api.getWeeklyReviews(token, { status: "SUBMITTED", pageSize: 20 }),
    api.getSupportTasks(token, { view: "active", pageSize: 30 }),
    roleCode === "SUPER_ADMIN"
      ? api.getControlTower(token)
      : Promise.resolve(null),
  ]);

  const actions =
    settled[0].status === "fulfilled"
      ? settled[0].value.data.actionItems
      : [];
  const referrals =
    settled[1].status === "fulfilled" ? settled[1].value.data.referrals : [];
  const reviews =
    settled[2].status === "fulfilled" ? settled[2].value.data.reviews : [];
  const tasks =
    settled[3].status === "fulfilled" ? settled[3].value.data.tasks : [];
  const tower =
    settled[4].status === "fulfilled" ? settled[4].value?.data : null;

  const raw: SeNavAlertItem[] = [];

  for (const row of actions) {
    if (row.createdById === userId) continue;
    const at = parseAt(row.updatedAt) || parseAt(row.createdAt);
    if (!at) continue;
    raw.push({
      id: `action-${row.id}`,
      section: "actions",
      kind: "Assignment",
      title: `${row.title} · ${row.profile.displayName}`,
      at,
      href: `/action-items/${row.id}`,
      createdById: row.createdById,
    });
  }

  for (const row of referrals) {
    const ownAsTl =
      row.teamLeadUserId === userId && row.initiatedBy !== "COMMANDO";
    const ownAsCommando =
      row.commandoUserId === userId && row.initiatedBy === "COMMANDO";
    if (ownAsTl || ownAsCommando) continue;
    const at = parseAt(row.updatedAt) || parseAt(row.createdAt);
    if (!at) continue;
    raw.push({
      id: `referral-${row.id}`,
      section: "overview",
      kind: "Referral",
      title: `${row.profileName || row.profile.displayName} · ${row.status.replace(/_/g, " ")}`,
      at,
      href: `/referrals/${row.id}`,
    });
  }

  for (const row of reviews) {
    if (row.createdById === userId) continue;
    const at = parseAt(row.submittedAt) || parseAt(row.createdAt);
    if (!at) continue;
    const pending =
      row.myStatus === "PENDING_SIGNATURE" ? " needs your signature" : "";
    raw.push({
      id: `review-${row.id}`,
      section: "reviews",
      kind: "Weekly review",
      title: `${row.weekLabel} · ${row.profile.displayName}${pending}`,
      at,
      href: `/weekly-reviews/${row.id}`,
      createdById: row.createdById,
    });
  }

  for (const row of tasks) {
    if (row.createdById === userId) continue;
    const at = parseAt(row.updatedAt) || parseAt(row.createdAt);
    if (!at) continue;
    raw.push({
      id: `task-${row.id}`,
      section: "support",
      kind: "Support task",
      title: `${row.title} · ${row.profile.displayName}`,
      at,
      href:
        roleCode === "SALES_SUPPORT_EXECUTIVE"
          ? `/my-tasks/${row.id}`
          : `/profiles/${row.salesExecutiveProfileId}/support`,
      createdById: row.createdById,
    });
  }

  if (tower) {
    for (const row of tower.alerts ?? []) {
      raw.push({
        id: `tower-alert-${row.code}`,
        section: "overview",
        kind: "Control tower",
        title: row.title,
        at: parseAt(tower.generatedAt) || 1,
        href: row.href || "/dashboard",
      });
    }
    for (const row of tower.recentActivity ?? []) {
      if (row.actor?.id === userId) continue;
      const at = parseAt(row.createdAt);
      if (!at) continue;
      raw.push({
        id: `audit-${row.id}`,
        section: "overview",
        kind: row.entityType.replace(/_/g, " "),
        title: row.action.replace(/_/g, " "),
        at,
        href: "/audit-logs",
        createdById: row.actor?.id ?? null,
      });
    }
  }

  return {
    counts: {},
    items: filterUnseenInboxItems(sortInboxItems(raw), inboxSeen),
  };
}

export function useSeNavAlerts(opts: {
  enabled: boolean;
  token: string | null;
  userId: string | null;
  roleCode?: RoleCode | string | null;
  profileId: string | null;
  pathname: string;
}) {
  const { enabled, token, userId, roleCode = null, profileId, pathname } = opts;
  const [counts, setCounts] = useState<SeAlertCounts>({});
  const [items, setItems] = useState<SeNavAlertItem[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled || !token || !userId) {
      setCounts({});
      setItems([]);
      return;
    }
    try {
      const next = await loadRoleInboxItems({
        token,
        userId,
        roleCode,
        profileId,
      });
      setCounts(next.counts);
      setItems(next.items);
    } catch {
      setCounts({});
      setItems([]);
    }
  }, [enabled, token, userId, roleCode, profileId]);

  useEffect(() => {
    void refresh();
    if (!enabled) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void refresh(), 45_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const inboxId = inboxSeenIdFromPathname(pathname);
    if (inboxId) {
      markInboxItemsSeen(userId, [inboxId]);
      setItems((prev) => prev.filter((item) => item.id !== inboxId));
    }

    if (!profileId || roleCode !== "SALES_EXECUTIVE") return;
    const related = seSectionFromRelatedPathname(pathname) as SeSection | null;
    const onWorkspace =
      pathname === `/profiles/${profileId}` ||
      pathname.startsWith(`/profiles/${profileId}/`);
    const section = related ?? (onWorkspace ? seSectionFromPathname(pathname) : null);
    if (!section) return;
    markSeNavSectionSeen(userId, section);
    setCounts((prev) => {
      if (!prev[section]) return prev;
      const next = { ...prev };
      delete next[section];
      return next;
    });
    setItems((prev) => prev.filter((item) => item.section !== section));
  }, [enabled, userId, profileId, pathname, roleCode]);

  const dismissItem = useCallback(
    (id: string) => {
      if (!userId) return;
      markInboxItemsSeen(userId, [id]);
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [userId],
  );

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const sections = Array.from(
      new Set(items.map((item) => item.section)),
    ) as SeSection[];
    markAllSeNavSectionsSeen(userId, sections);
    markInboxItemsSeen(
      userId,
      items.map((item) => item.id),
    );
    setCounts({});
    setItems([]);
  }, [userId, items]);

  return { counts, items, markAllRead, dismissItem, refresh };
}

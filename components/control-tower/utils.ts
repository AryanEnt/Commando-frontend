import type { ControlTowerActivityItem, ControlTowerData } from "@/lib/api";

export const ACTIVITY_LABELS: Record<string, string> = {
  COMMANDO_ASSIGNMENT_STARTED: "Intervention started",
  COMMANDO_ASSIGNMENT_ENDED: "Intervention completed",
  COMMANDO_ASSIGNMENT_EXITED: "Intervention exited",
  COMMANDO_ASSIGNMENT_TRANSFERRED: "Assignment transferred",
  INTERVENTION_OUTCOME_RECORDED: "Intervention outcome recorded",
  REFERRAL_SUBMITTED: "Referral submitted",
  REFERRAL_ACKNOWLEDGED: "Referral acknowledged",
  REFERRAL_IN_PROGRESS: "Referral in progress",
  REFERRAL_COMPLETED: "Handoff closed",
  COMMANDO_REQUEST_SUBMITTED: "Commando request submitted",
  REFERRAL_INFORMATION_PROVIDED: "Referral information provided",
  REFERRAL_REJECTED: "Commando request rejected",
  WEEKLY_REVIEW_SUBMITTED: "Weekly review submitted",
  SUPPORT_TASK_CREATED: "Support task assigned",
  SUPPORT_TASK_STATUS_UPDATED: "Support task updated",
  ACTION_ITEM_COMPLETED: "Action item completed",
  ACTION_ITEM_CREATED: "Action item created",
  ROLE_ASSIGNMENT_CREATED: "Role assignment created",
};

export type WorkflowStatus = "Healthy" | "Attention" | "Watch";

export type WorkflowRow = {
  key: string;
  workflow: string;
  state: string;
  count: number;
  status: WorkflowStatus;
  href: string;
  /** Keeps request pipeline distinct from active interventions. */
  category: "requests" | "interventions" | "accountability" | "support" | "activity";
};

export function formatControlTowerTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFreshness(iso: string | undefined, loadedAt: number) {
  const source = iso ? new Date(iso).getTime() : loadedAt;
  const seconds = Math.max(0, Math.round((Date.now() - source) / 1000));
  if (seconds < 45) return "Updated just now";
  if (seconds < 120) return "Updated 1 minute ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} minutes ago`;
  return `Updated at ${new Date(source).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatActivityWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const t = date.getTime();
  const time = formatControlTowerTime(iso);
  if (t >= startOfToday) return `Today · ${time}`;
  if (t >= startOfYesterday) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} · ${time}`;
}

export function activitySubject(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  for (const key of [
    "profileName",
    "displayName",
    "title",
    "entityLabel",
  ]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function activityLabel(item: ControlTowerActivityItem) {
  return (
    ACTIVITY_LABELS[item.action] ??
    item.action.replaceAll("_", " ").toLowerCase()
  );
}

export function attentionActionLabel(
  severity: "info" | "warning" | "critical",
) {
  if (severity === "critical") return "Investigate";
  if (severity === "warning") return "Review";
  return "View";
}

/**
 * Workflow health rows from real metrics.
 * Referrals (requests) are never merged with active interventions.
 */
export function buildWorkflowRows(tower: ControlTowerData): WorkflowRow[] {
  const m = tower.metrics;
  return [
    {
      key: "referrals-pending",
      workflow: "Referrals awaiting acknowledgement",
      state:
        m.referrals.submitted > 0
          ? "Submitted — waiting for Commando"
          : "No pending acknowledgements",
      count: m.referrals.submitted,
      status: m.referrals.submitted > 0 ? "Attention" : "Healthy",
      href: "/referrals?status=SUBMITTED",
      category: "requests",
    },
    {
      key: "referrals-pipeline",
      workflow: "Referrals in flight",
      state: "Acknowledged or in progress (not yet an active intervention)",
      count: m.referrals.acknowledged + m.referrals.inProgress,
      status:
        m.referrals.acknowledged + m.referrals.inProgress > 0
          ? "Watch"
          : "Healthy",
      href: "/referrals",
      category: "requests",
    },
    {
      key: "interventions-active",
      workflow: "Active interventions",
      state: "Sales Executives with an active Commando assignment",
      count: m.interventions.active,
      status: m.interventions.active > 0 ? "Watch" : "Healthy",
      href: "/reports/commando-performance?status=ACTIVE",
      category: "interventions",
    },
    {
      key: "actions-overdue",
      workflow: "Overdue assignments",
      state:
        m.overdueActionItems > 0
          ? "Past due and still open"
          : "None overdue",
      count: m.overdueActionItems,
      status: m.overdueActionItems > 0 ? "Attention" : "Healthy",
      href: "/reports",
      category: "accountability",
    },
    {
      key: "reviews-draft",
      workflow: "Draft weekly reviews",
      state:
        m.draftWeeklyReviews > 0
          ? "Started but not submitted"
          : "No open drafts",
      count: m.draftWeeklyReviews,
      status: m.draftWeeklyReviews > 0 ? "Watch" : "Healthy",
      href: "/reports",
      category: "accountability",
    },
    {
      key: "monitoring-7d",
      workflow: "Monitoring (last 7 days)",
      state: "Live monitoring records observed this week",
      count: m.monitoringLast7d,
      status: "Healthy",
      href: "/reports",
      category: "activity",
    },
    {
      key: "support-overdue",
      workflow: "Overdue support tasks",
      state:
        m.overdueSupportTasks > 0
          ? "Pending or in progress past due date"
          : "None overdue",
      count: m.overdueSupportTasks,
      status: m.overdueSupportTasks > 0 ? "Attention" : "Healthy",
      href: "/reports",
      category: "support",
    },
  ];
}

export function statusTone(status: WorkflowStatus) {
  if (status === "Healthy") {
    return {
      badge: "ON_TRACK" as const,
      label: "Healthy",
    };
  }
  if (status === "Attention") {
    return {
      badge: "NEEDS_ATTENTION" as const,
      label: "Attention",
    };
  }
  return {
    badge: "PENDING" as const,
    label: "Watch",
  };
}

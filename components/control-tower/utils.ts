import type { ControlTowerActivityItem, ControlTowerData } from "@/lib/api";

export const ACTIVITY_LABELS: Record<string, string> = {
  COMMANDO_ASSIGNMENT_STARTED: "Commando assignment created",
  COMMANDO_ASSIGNMENT_ENDED: "Intervention completed",
  COMMANDO_ASSIGNMENT_EXITED: "Intervention exited",
  COMMANDO_ASSIGNMENT_TRANSFERRED: "Assignment transferred",
  INTERVENTION_OUTCOME_RECORDED: "Intervention outcome recorded",
  REFERRAL_SUBMITTED: "Referral submitted",
  REFERRAL_ACKNOWLEDGED: "Referral acknowledged",
  REFERRAL_IN_PROGRESS: "Referral marked in progress",
  REFERRAL_COMPLETED: "Handoff closed",
  COMMANDO_REQUEST_SUBMITTED: "Commando request submitted",
  REFERRAL_INFORMATION_PROVIDED: "Team Lead provided referral information",
  REFERRAL_REJECTED: "Commando request rejected",
  WEEKLY_REVIEW_SUBMITTED: "Weekly review submitted",
  SUPPORT_TASK_CREATED: "Support task assigned",
  SUPPORT_TASK_STATUS_UPDATED: "Support task updated",
  ACTION_ITEM_COMPLETED: "Action item completed",
  ACTION_ITEM_CREATED: "Action item created",
  ROLE_ASSIGNMENT_CREATED: "Role assignment created",
};

export type WorkflowStatus = "Healthy" | "Attention" | "Review";

export type WorkflowRow = {
  key: string;
  workflow: string;
  state: string;
  status: WorkflowStatus;
  href: string;
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

export function buildWorkflowRows(tower: ControlTowerData): WorkflowRow[] {
  return [
    {
      key: "referrals",
      workflow: "Referrals",
      state:
        tower.metrics.referrals.submitted > 0
          ? `${tower.metrics.referrals.submitted} awaiting acknowledgement`
          : "No pending acknowledgements",
      status: tower.metrics.referrals.submitted > 0 ? "Attention" : "Healthy",
      href: "/referrals?status=SUBMITTED",
    },
    {
      key: "actions",
      workflow: "Action Items",
      state:
        tower.metrics.overdueActionItems > 0
          ? `${tower.metrics.overdueActionItems} overdue`
          : "None overdue",
      status: tower.metrics.overdueActionItems > 0 ? "Attention" : "Healthy",
      href: "/reports",
    },
    {
      key: "reviews",
      workflow: "Weekly Reviews",
      state:
        tower.metrics.draftWeeklyReviews > 0
          ? `${tower.metrics.draftWeeklyReviews} drafts`
          : "No open drafts",
      status: tower.metrics.draftWeeklyReviews > 0 ? "Review" : "Healthy",
      href: "/reports",
    },
    {
      key: "support",
      workflow: "Support Tasks",
      state:
        tower.metrics.overdueSupportTasks > 0
          ? `${tower.metrics.overdueSupportTasks} overdue`
          : "None overdue",
      status: tower.metrics.overdueSupportTasks > 0 ? "Attention" : "Healthy",
      href: "/reports",
    },
  ];
}

/** Health score from real workflow states only (0–100). */
export function workflowHealthPercent(rows: WorkflowRow[]) {
  if (rows.length === 0) return 100;
  const healthy = rows.filter((r) => r.status === "Healthy").length;
  return Math.round((healthy / rows.length) * 100);
}

export function statusTone(status: WorkflowStatus) {
  if (status === "Healthy") {
    return {
      dot: "bg-[var(--status-success)]",
      text: "text-[var(--status-success)]",
      bar: "bg-[var(--status-success)]",
      label: "Healthy",
    };
  }
  if (status === "Attention") {
    return {
      dot: "bg-[var(--status-warn)]",
      text: "text-[var(--status-warn)]",
      bar: "bg-[var(--status-warn)]",
      label: "Attention",
    };
  }
  return {
    dot: "bg-[var(--status-info)]",
    text: "text-[var(--status-info)]",
    bar: "bg-[var(--status-info)]",
    label: "Review",
  };
}

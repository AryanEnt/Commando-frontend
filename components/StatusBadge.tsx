import { statusLabel } from "@/lib/labels";

const TONE: Record<string, string> = {
  ACTIVE: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  IN_PROGRESS: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  OPEN: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  YES: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  DONE: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  ACKNOWLEDGED: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  COMPLETED: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  SUBMITTED: "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  PENDING: "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  ACCEPTED: "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  BLOCKED: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  DRAFT: "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  INACTIVE: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  ARCHIVED: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  REPLACED: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  SUPERSEDED: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  EXPIRED: "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  OVERDUE: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  HIGH: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  MEDIUM: "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  LOW: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  TEAM_LEAD: "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  SUPER_ADMIN: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  COMMANDO: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--status-success-ring)]",
  COMMANDO_EXECUTIVE: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--status-success-ring)]",
  SALES_EXECUTIVE: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--status-success-ring)]",
  SALES_SUPPORT_EXECUTIVE: "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  EXITED: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  CANCELLED: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  REJECTED: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  NO: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  ON_TRACK: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  NEEDS_ATTENTION: "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  AT_RISK: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  UNDER_INTERVENTION: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--status-success-ring)]",
  NORMAL_MANAGEMENT: "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const key = status.toUpperCase();
  const tone = TONE[key] ?? TONE.INACTIVE;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge status={priority} />;
}

import { statusLabel } from "@/lib/labels";

/**
 * Canonical status tones for Commando operational states.
 * Color is never the only signal — badges always include a text label.
 */
const TONE: Record<string, string> = {
  /* Success / active */
  ACTIVE:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  IN_PROGRESS:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  OPEN:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  YES:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  DONE:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  ACKNOWLEDGED:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  COMPLETED:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  APPROVED:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  SIGNED:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
  ON_TRACK:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",

  /* Info / submitted */
  SUBMITTED:
    "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  ACCEPTED:
    "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  TEAM_LEAD:
    "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  SALES_SUPPORT_EXECUTIVE:
    "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
  NORMAL_MANAGEMENT:
    "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",

  /* Warning / pending */
  PENDING:
    "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  PENDING_SIGNATURE:
    "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  DRAFT:
    "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  EXPIRED:
    "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  MEDIUM:
    "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  NEEDS_ATTENTION:
    "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
  NEEDS_IMPROVEMENT:
    "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",

  /* Danger / blocked */
  BLOCKED:
    "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  OVERDUE:
    "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  HIGH:
    "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  REJECTED:
    "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  AT_RISK:
    "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
  CRITICAL:
    "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",

  /* Neutral / historical */
  INACTIVE:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  ARCHIVED:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  REPLACED:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  SUPERSEDED:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  EXITED:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  CANCELLED:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  NO:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  LOW:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
  SUPER_ADMIN:
    "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",

  /* Brand / intervention context */
  COMMANDO:
    "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]",
  COMMANDO_EXECUTIVE:
    "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]",
  SALES_EXECUTIVE:
    "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]",
  UNDER_INTERVENTION:
    "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]",
  EXCELLENT:
    "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[var(--text-meta)] font-medium ring-1 ring-inset ${tone}`}
    >
      <span className="status-dot shrink-0" aria-hidden />
      {label ?? statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge status={priority} />;
}

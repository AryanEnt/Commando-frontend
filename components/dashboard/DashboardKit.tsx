import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui";

/** Semantic signal shared by KPI values, row markers and status pills. */
export type SignalTone = "positive" | "warning" | "critical" | "info" | "neutral";

/** Quiet donut: healthy vs needing attention, with the total in the centre. */
export function HealthRing({
  healthy,
  attention,
  size = 92,
}: {
  healthy: number;
  attention: number;
  size?: number;
}) {
  const total = healthy + attention;
  const healthyPct = total ? (healthy / total) * 100 : 0;
  const attentionPct = total ? (attention / total) * 100 : 0;
  const gap = healthy && attention ? 1.5 : 0;
  return (
    <div className="dash-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" width={size} height={size} aria-hidden focusable="false">
        <circle cx="21" cy="21" r="16" fill="none" stroke="var(--color-line)" strokeWidth="5" />
        {healthyPct > 0 ? (
          <circle
            cx="21"
            cy="21"
            r="16"
            fill="none"
            stroke="var(--status-success)"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${Math.max(healthyPct - gap, 0)} ${100 - healthyPct + gap}`}
            transform="rotate(-90 21 21)"
          />
        ) : null}
        {attentionPct > 0 ? (
          <circle
            cx="21"
            cy="21"
            r="16"
            fill="none"
            stroke="var(--status-warn-solid)"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${Math.max(attentionPct - gap, 0)} ${100 - attentionPct + gap}`}
            strokeDashoffset={-healthyPct}
            transform="rotate(-90 21 21)"
          />
        ) : null}
      </svg>
      <span className="dash-ring-value">{total}</span>
    </div>
  );
}

export function HealthSummary({
  title,
  healthy,
  attention,
  healthyLabel,
  attentionLabel,
  emptyText,
}: {
  title: string;
  healthy: number;
  attention: number;
  healthyLabel: string;
  attentionLabel: string;
  emptyText: string;
}) {
  const total = healthy + attention;
  const summary =
    total === 0
      ? emptyText
      : attention === 0
        ? `All ${total} ${healthyLabel.toLowerCase()}`
        : `${healthy} of ${total} ${healthyLabel.toLowerCase()}`;
  return (
    <div className="dash-health" role="group" aria-label={`${title}: ${summary}`}>
      <HealthRing healthy={healthy} attention={attention} />
      <div className="min-w-0">
        <p className="text-eyebrow">{title}</p>
        <p className="mt-1 text-[1.05rem] font-semibold leading-snug tracking-tight text-[var(--color-ink)]">
          {summary}
        </p>
        <ul className="mt-2 space-y-1 text-[12px] text-[var(--color-ink-muted)]">
          <li className="flex items-center gap-2">
            <span className="dash-legend-dot" data-tone="positive" aria-hidden />
            {healthyLabel}
            <span className="ml-auto font-semibold tabular-nums text-[var(--color-ink)]">
              {healthy}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="dash-legend-dot" data-tone="warning" aria-hidden />
            {attentionLabel}
            <span className="ml-auto font-semibold tabular-nums text-[var(--color-ink)]">
              {attention}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Anchor visual + flat KPI strip in one band — the page's single focal point. */
export function DashHero({ anchor, children }: { anchor: ReactNode; children: ReactNode }) {
  return (
    <section className="dash-hero surface-card" aria-label="Summary">
      {anchor}
      <div className="dash-kpis">{children}</div>
    </section>
  );
}

/** Typography-led KPI. Colour only lands on the number, and only when it signals something. */
export function KpiStat({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint: string;
  href: string;
  tone?: SignalTone;
}) {
  return (
    <Link href={href} className="dash-kpi" data-tone={tone}>
      <span className="dash-kpi-value">{value}</span>
      <span className="dash-kpi-label">{label}</span>
      <span className="dash-kpi-hint">{hint}</span>
    </Link>
  );
}

/**
 * Panel surfaces by meaning: `plain` (primary white card), `brand` (neutral work),
 * `warn` (risk), `bare` (secondary, unboxed).
 */
export function DashPanel({
  id,
  tone = "plain",
  title,
  description,
  eyebrow,
  aside,
  className = "",
  children,
}: {
  id?: string;
  tone?: "plain" | "brand" | "warn" | "bare";
  title: string;
  description?: string;
  eyebrow?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`dash-panel ${className}`} data-tone={tone}>
      <div className="dash-panel-head">
        <div className="min-w-0">
          {eyebrow ? <p className="text-eyebrow">{eyebrow}</p> : null}
          <h2 id={headingId} className={`text-section-title ${eyebrow ? "mt-1" : ""}`}>
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-meta">{description}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function DashSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="dash-hero surface-card">
        <div className="dash-health">
          <Skeleton className="h-[92px] w-[92px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="dash-kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dash-kpi">
              <Skeleton className="h-9 w-12" />
              <Skeleton className="mt-3 h-3 w-24" />
              <Skeleton className="mt-1.5 h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-52 w-full rounded-[var(--radius-lg)]" />
      <div className="grid gap-5 lg:grid-cols-12">
        <Skeleton className="h-40 w-full rounded-[var(--radius-lg)] lg:col-span-7" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-lg)] lg:col-span-5" />
      </div>
    </div>
  );
}

export function DashEmpty({
  title,
  description,
  tone = "neutral",
}: {
  title: string;
  description: string;
  tone?: SignalTone;
}) {
  return (
    <div className="dash-empty">
      <p className="dash-empty-title" data-tone={tone}>
        {title}
      </p>
      <p className="mt-1 max-w-lg text-meta leading-relaxed">{description}</p>
    </div>
  );
}

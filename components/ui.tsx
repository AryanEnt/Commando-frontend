"use client";

import Link from "next/link";
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icons } from "@/components/icons";

const inputClass =
  "mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-[var(--text-body)] leading-snug text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-ink-subtle)]";

const labelClass = "block text-[var(--text-label)] font-medium text-[var(--color-ink)]";

type ButtonVariant = "primary" | "secondary" | "soft" | "success" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className = "",
  iconOnly = false,
) {
  return `btn btn-${variant} btn-${size}${iconOnly ? " btn-icon" : ""} ${className}`.trim();
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  /** Optional breadcrumb row rendered above the title. */
  breadcrumbs?: React.ReactNode;
}) {
  return (
    <header className="page-hero mb-1 space-y-3">
      {breadcrumbs ? <div className="min-w-0">{breadcrumbs}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          {eyebrow ? <p className="text-eyebrow">{eyebrow}</p> : null}
          <h1 className={`text-page-title ${eyebrow ? "mt-1" : ""}`}>{title}</h1>
          {description && (
            <p className="mt-1.5 text-secondary max-w-xl">{description}</p>
          )}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warn" | "danger" | "info" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    success:
      "text-[var(--status-success)] bg-[var(--status-success-bg)] ring-[var(--status-success-ring)]",
    warn: "text-[var(--status-warn)] bg-[var(--status-warn-bg)] ring-[var(--status-warn-ring)]",
    danger:
      "text-[var(--status-danger)] bg-[var(--status-danger-bg)] ring-[var(--status-danger-ring)]",
    info: "text-[var(--status-info)] bg-[var(--status-info-bg)] ring-[var(--status-info-ring)]",
    neutral:
      "text-[var(--status-neutral)] bg-[var(--status-neutral-bg)] ring-[var(--status-neutral-ring)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[var(--text-meta)] font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      <span className="status-dot" aria-hidden />
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type="button"
      className={buttonClassName(variant, size, className)}
      {...props}
    />
  );
}

export function IconButton({
  variant = "ghost",
  size = "md",
  className = "",
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Accessible name — required for icon-only buttons. */
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={buttonClassName(variant, size, className, true)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {required ? (
        <span className="text-[var(--status-danger)]" aria-hidden>
          {" "}
          *
        </span>
      ) : null}
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-xs font-normal text-[var(--color-ink-muted)]">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          className="mt-1 block text-xs font-normal text-[var(--status-danger)]"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput({
  label,
  hint,
  error,
  required,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <input className={`${inputClass} h-10 ${className}`} required={required} {...props} />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  error,
  required,
  rows = 4,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <textarea
        className={`${inputClass} min-h-[6rem] py-2.5 resize-y ${className}`}
        rows={rows}
        required={required}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <select className={`${inputClass} h-10 ${className}`} required={required} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-brand-ring)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[var(--shadow-sm)]">
      {children}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5 text-sm"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 transition ${
              active
                ? "bg-[var(--color-brand)] text-[var(--color-brand-on)]"
                : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)]"
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center shadow-[var(--shadow-sm)]"
      role="status"
      aria-live="polite"
    >
      <div
        className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-brand)]"
        aria-hidden
      />
      <p className="text-meta">{label}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-line)]/70 ${className}`}
      aria-hidden
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-frame">
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading table</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  action,
  icon = "emptyInbox",
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  action?: ReactNode;
  /** Line-art icon from the shared set. Pass null to hide. */
  icon?:
    | "emptyClipboard"
    | "emptyInbox"
    | "emptyUsers"
    | "emptySupport"
    | "emptySearch"
    | "tasks"
    | "reviews"
    | "monitoring"
    | "feedback"
    | null;
}) {
  const Icon =
    icon == null
      ? null
      : icon === "emptyClipboard"
        ? Icons.emptyClipboard
        : icon === "emptyInbox"
          ? Icons.emptyInbox
          : icon === "emptyUsers"
            ? Icons.emptyUsers
            : icon === "emptySupport"
              ? Icons.emptySupport
              : icon === "emptySearch"
                ? Icons.emptySearch
                : icon === "tasks"
                  ? Icons.tasks
                  : icon === "reviews"
                    ? Icons.reviews
                    : icon === "monitoring"
                      ? Icons.monitoring
                      : Icons.feedback;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-brand-ring)] bg-[var(--color-tint-brand)] px-5 py-11 text-center shadow-[var(--shadow-sm)]">
      {Icon ? (
        <span className="icon-well icon-well-brand mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full">
          <Icon size={18} />
        </span>
      ) : null}
      <p className="text-section-title">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-secondary">{description}</p>
      )}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      {!action && actionHref && actionLabel && (
        <div className="mt-4 flex justify-center">
          <ButtonLink href={actionHref} size="sm">
            {actionLabel}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] px-4 py-4 text-sm"
      role="alert"
    >
      <p className="font-semibold text-[var(--status-danger)]">
        Unable to load
      </p>
      <p className="mt-1 text-[var(--color-ink-muted)]">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  href,
  hint,
  muted,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  href: string;
  hint?: string;
  muted?: boolean;
  /** Colored top accent — keep subtle; default brand. */
  tone?: "brand" | "accent" | "success" | "warn" | "danger" | "info";
}) {
  const tint = {
    brand: "kpi-mint",
    accent: "kpi-teal",
    success: "kpi-lime",
    warn: "kpi-amber",
    danger: "kpi-rose",
    info: "kpi-blue",
  }[tone];

  return (
    <Link
      href={href}
      className={`kpi-card ${tint} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]`}
    >
      <p className="text-eyebrow">{label}</p>
      <p
        className={`mt-2 text-kpi ${muted ? "text-[var(--color-ink-subtle)]" : ""}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-meta">{hint}</p>}
    </Link>
  );
}

export function PulseGrid({
  children,
  columns = 5,
}: {
  children: ReactNode;
  columns?: 5 | 6;
}) {
  return (
    <div
      className={
        columns === 6
          ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      }
    >
      {children}
    </div>
  );
}

export function PulseStat({
  label,
  value,
  hint,
  href,
  warn,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  warn?: boolean;
  tone?: "brand" | "accent" | "success" | "warn" | "danger" | "info";
}) {
  const resolved = tone ?? (warn ? "warn" : "brand");
  const tint = {
    brand: "kpi-mint",
    accent: "kpi-teal",
    success: "kpi-lime",
    warn: "kpi-amber",
    danger: "kpi-rose",
    info: "kpi-blue",
  }[resolved];

  return (
    <a
      href={href}
      className={`kpi-card ${tint} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]`}
    >
      <p className="text-eyebrow">{label}</p>
      <p
        className={`mt-2 text-kpi ${
        warn
          ? resolved === "danger"
            ? "text-[var(--status-danger)]"
            : "text-[var(--status-warn)]"
          : ""
      }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-meta">{hint}</p>
    </a>
  );
}

/** Compact performance score with labeled bar. */
export function PerformanceMeter({
  value,
  label,
  className = "",
}: {
  /** 0–100 score. */
  value: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tier =
    clamped >= 85
      ? "is-excellent"
      : clamped >= 70
        ? "is-good"
        : clamped >= 50
          ? "is-fair"
          : "is-poor";
  const tierLabel =
    label ??
    (clamped >= 85
      ? "Excellent"
      : clamped >= 70
        ? "On track"
        : clamped >= 50
          ? "Needs attention"
          : "At risk");
  const tierColor =
    clamped >= 85
      ? "text-[var(--status-success)]"
      : clamped >= 70
        ? "text-[var(--color-accent)]"
        : clamped >= 50
          ? "text-[var(--status-warn)]"
          : "text-[var(--status-danger)]";

  return (
    <div className={`min-w-[7.5rem] ${className}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-kpi text-[1.125rem]">{clamped}%</span>
        <span className={`text-meta font-medium ${tierColor}`}>{tierLabel}</span>
      </div>
      <div className={`perf-bar ${tier}`} role="meter" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={tierLabel}>
        <span style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

/** Semantic alert for inline page feedback (not toast). */
export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "success" | "warn" | "danger" | "info" | "neutral";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    success:
      "border-[var(--status-success-ring)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
    warn: "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] text-[var(--status-warn)]",
    danger:
      "border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
    info: "border-[var(--status-info-ring)] bg-[var(--status-info-bg)] text-[var(--status-info)]",
    neutral:
      "border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink)]",
  };
  return (
    <div
      role="status"
      className={`rounded-[var(--radius-md)] border px-4 py-3 text-[var(--text-body)] ${tones[tone]}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1 text-[var(--color-ink-muted)]" : undefined}>
        {children}
      </div>
    </div>
  );
}

/** Consistent table shell for list pages. */
export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="table-frame overflow-x-auto">
      {children}
    </div>
  );
}

/** Visually distinct read-only panel for detail views. */
export function ReadOnlyPanel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-[var(--space-panel)] text-body shadow-[var(--shadow-sm)]">
      <p className="mb-3 text-eyebrow">
        {title ? `${title} · read-only` : "Read-only"}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function DateTimeCell({
  value,
  showTime = true,
}: {
  value: string | Date | null | undefined;
  showTime?: boolean;
}) {
  if (!value) {
    return <span className="text-[var(--color-ink-subtle)]">—</span>;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return <span className="text-[var(--color-ink-subtle)]">—</span>;
  }
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!showTime) {
    return <span className="tabular-nums text-[var(--color-ink)]">{date}</span>;
  }
  return (
    <span className="inline-flex items-baseline gap-1.5 tabular-nums leading-tight">
      <span className="text-[var(--color-ink)]">{date}</span>
      <span className="text-[var(--color-ink-muted)]" aria-hidden>
        ·
      </span>
      <span className="text-[var(--color-ink-muted)]">{time}</span>
    </span>
  );
}

/** Compact date + time inputs for assignment start/end. */
export function DateTimeFields({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  required,
  disabled,
}: {
  label: string;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const dateId = `${label.replace(/\s+/g, "-").toLowerCase()}-date`;
  const timeId = `${label.replace(/\s+/g, "-").toLowerCase()}-time`;
  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{label}</legend>
      <div className="mt-1.5 grid grid-cols-[1.4fr_1fr] gap-2">
        <div className="min-w-0">
          <label htmlFor={dateId} className="sr-only">
            {label} date
          </label>
          <input
            id={dateId}
            type="date"
            required={required}
            disabled={disabled}
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className={`${inputClass} h-10 !mt-0`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={timeId} className="sr-only">
            {label} time
          </label>
          <input
            id={timeId}
            type="time"
            required={required}
            disabled={disabled}
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className={`${inputClass} h-10 !mt-0`}
          />
        </div>
      </div>
    </fieldset>
  );
}

export function Panel({
  title,
  description,
  tone = "default",
  children,
  actions,
}: {
  title?: string;
  description?: string;
  tone?: "default" | "active" | "history";
  children: ReactNode;
  actions?: ReactNode;
}) {
  const tones = {
    default: "border-[var(--color-line)]",
    active: "border-[var(--status-success-ring)] border-l-[3px] border-l-[var(--status-success)]",
    history: "border-[var(--color-line-strong)]",
  };
  const headers = {
    default:
      "border-[var(--color-brand-ring)] bg-[var(--color-mint)] text-[var(--color-ink)]",
    active:
      "border-[var(--status-success-ring)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
    history:
      "border-[var(--color-line)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)]",
  };
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-md)] border bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ${tones[tone]}`}
    >
      {title && (
        <div
          className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${headers[tone]}`}
        >
          <div className="min-w-0">
            <p className="text-section-title">{title}</p>
            {description ? (
              <p className="mt-0.5 text-meta normal-case tracking-normal opacity-90">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4 overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="dialog-panel w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]">
        <h2
          id="confirm-title"
          className="text-base font-semibold text-[var(--color-ink)]"
        >
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">
          {message}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] font-semibold text-[var(--color-brand-dark)] ${sizes[size]}`}
      aria-hidden
    >
      {letters || "?"}
    </span>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-section-title">{title}</h2>
        {description && (
          <p className="mt-0.5 text-meta">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div
      role="tablist"
      className="flex flex-nowrap gap-1 overflow-x-auto border-b border-[var(--color-line)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${
              active
                ? "border-[var(--color-brand)] font-medium text-[var(--color-brand-dark)]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function LifecycleStepper({
  stages,
  current,
}: {
  stages: Array<{ key: string; label: string; hint?: string }>;
  current: string;
}) {
  const idx = Math.max(
    0,
    stages.findIndex((s) => s.key === current),
  );
  return (
    <ol className="flex w-full min-w-0 items-start gap-0 overflow-x-auto pb-1">
      {stages.map((stage, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li
            key={stage.key}
            className="flex min-w-[5.5rem] flex-1 flex-col items-center"
          >
            <div className="flex w-full items-center">
              <span
                className={`h-px flex-1 transition-colors duration-200 ${
                  i === 0
                    ? "bg-transparent"
                    : done || active
                      ? "bg-[var(--color-brand)]"
                      : "bg-[var(--color-line)]"
                }`}
                aria-hidden
              />
              <span
                className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition duration-200 ${
                  done
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-brand-on)]"
                    : active
                      ? "border-[var(--color-brand)] bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[0_0_0_3px_var(--color-brand-soft)]"
                      : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink-subtle)]"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <Icons.check size={12} />
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active
                        ? "bg-[var(--color-brand)]"
                        : "bg-[var(--color-line-strong)]"
                    }`}
                  />
                )}
              </span>
              <span
                className={`h-px flex-1 transition-colors duration-200 ${
                  i === stages.length - 1
                    ? "bg-transparent"
                    : done
                      ? "bg-[var(--color-brand)]"
                      : "bg-[var(--color-line)]"
                }`}
                aria-hidden
              />
            </div>
            <p
              className={`mt-2.5 max-w-[7.5rem] text-center text-[12px] leading-snug ${
                active
                  ? "font-semibold text-[var(--color-ink)]"
                  : done
                    ? "font-medium text-[var(--color-ink)]"
                    : "font-medium text-[var(--color-ink-subtle)]"
              }`}
            >
              {stage.label}
            </p>
            {active && stage.hint ? (
              <p className="mt-0.5 max-w-[8.5rem] text-center text-[11px] leading-snug text-[var(--color-ink-muted)]">
                {stage.hint}
              </p>
            ) : null}
            <p className="sr-only">
              {active ? "Current stage" : done ? "Completed" : "Upcoming"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function AttentionList({
  items,
}: {
  items: Array<{ href: string; title: string; meta: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-[var(--color-line)]">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="group flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
          >
            <span className="min-w-0">
              <span
                className="block truncate text-sm font-medium text-[var(--color-ink)]"
                title={item.title}
              >
                {item.title}
              </span>
              <span
                className="block truncate text-xs text-[var(--color-ink-muted)]"
                title={item.meta}
              >
                {item.meta}
              </span>
            </span>
            <Icons.chevron
              size={16}
              className="shrink-0 text-[var(--color-ink-subtle)] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = {
    md: "max-w-md",
    lg: "max-w-lg",
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="overlay-backdrop absolute inset-0 bg-[var(--color-ink)]/30"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`drawer-panel relative flex h-full w-full ${widths[size]} flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id="drawer-title"
              className="text-base font-semibold tracking-tight"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export { inputClass, labelClass };

"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-ink-subtle)]";

const labelClass = "block text-sm font-medium text-[var(--color-ink)]";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60",
    secondary:
      "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] disabled:opacity-60",
    danger:
      "border border-[var(--status-danger-ring)] bg-[var(--color-surface)] text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] disabled:opacity-60",
    ghost: "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-60",
  };
  const sizes = {
    sm: "h-8 px-2.5 text-xs",
    md: "h-9 px-3.5 text-sm",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
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
      {required ? <span className="text-red-600"> *</span> : null}
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-xs font-normal text-red-600" role="alert">
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
      <input className={`${inputClass} ${className}`} required={required} {...props} />
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
        className={`${inputClass} resize-y ${className}`}
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
      <select className={`${inputClass} ${className}`} required={required} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-3">
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
      className="inline-flex rounded border border-slate-300 bg-white p-0.5 text-sm"
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
                ? "bg-[var(--color-brand)] text-white"
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
    <div className="rounded border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
      <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      {label}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200/80 ${className}`}
      aria-hidden
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
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
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          {description}
        </p>
      )}
      {action}
      {!action && actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-block rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm text-white hover:bg-[var(--color-brand-hover)]"
        >
          {actionLabel}
        </Link>
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
      className="rounded border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"
      role="alert"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded border border-red-300 bg-white px-3 py-1.5 text-xs text-red-900 hover:bg-red-50"
        >
          Try again
        </button>
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
}: {
  label: string;
  value: string | number;
  href: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block cursor-pointer border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition duration-150 hover:border-[var(--color-line-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-[var(--radius-md)]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
        {label}
      </p>
      <p
        className={`mt-1.5 text-xl font-semibold tabular-nums ${
          muted ? "text-[var(--color-ink-subtle)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{hint}</p>}
    </Link>
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
    <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
      {title ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title} · read-only
        </p>
      ) : (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Read-only
        </p>
      )}
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
  if (!value) return <span className="text-slate-400">—</span>;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="tabular-nums text-slate-800">
        {d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })}
      </span>
      {showTime && (
        <span className="text-xs tabular-nums text-slate-500">
          {d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          })}{" "}
          UTC
        </span>
      )}
    </span>
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
    default: "border-slate-200",
    active: "border-emerald-200",
    history: "border-slate-300",
  };
  const headers = {
    default: "border-slate-100 bg-slate-50 text-slate-600",
    active: "border-emerald-100 bg-emerald-50 text-emerald-800",
    history: "border-slate-200 bg-slate-100 text-slate-700",
  };
  return (
    <div className={`overflow-hidden rounded border bg-white ${tones[tone]}`}>
      {title && (
        <div
          className={`flex items-start justify-between gap-3 border-b px-3 py-2 ${headers[tone]}`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide">
              {title}
            </p>
            {description ? (
              <p className="mt-0.5 text-xs font-normal normal-case tracking-normal opacity-80">
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-4 shadow-lg">
        <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] font-semibold text-white ${sizes[size]}`}
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
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h2>
        {description && (
          <p className="text-xs text-[var(--color-ink-muted)]">{description}</p>
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
                ? "border-[var(--color-brand)] font-medium text-[var(--color-ink)]"
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
    <ol className="flex flex-wrap items-start gap-0">
      {stages.map((stage, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={stage.key} className="flex min-w-[4.5rem] flex-1 items-start">
            <div className="flex w-full flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={`h-px flex-1 ${i === 0 ? "bg-transparent" : done || active ? "bg-[var(--color-brand)]" : "bg-[var(--color-line)]"}`}
                  aria-hidden
                />
                <span
                  className={`progress-dot ${done ? "is-done" : ""} ${active ? "is-current" : ""}`}
                />
                <span
                  className={`h-px flex-1 ${i === stages.length - 1 ? "bg-transparent" : done ? "bg-[var(--color-brand)]" : "bg-[var(--color-line)]"}`}
                  aria-hidden
                />
              </div>
              <p
                className={`mt-2 text-[11px] font-medium ${
                  active
                    ? "text-[var(--color-brand)]"
                    : done
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-ink-subtle)]"
                }`}
              >
                {stage.label}
              </p>
              <p className="sr-only">
                {active ? "Current stage" : done ? "Completed" : "Upcoming"}
              </p>
            </div>
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
            className="flex items-start justify-between gap-3 px-1 py-2.5 hover:bg-[var(--color-surface-2)]"
          >
            <span>
              <span className="block text-sm font-medium text-[var(--color-ink)]">
                {item.title}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {item.meta}
              </span>
            </span>
            <span className="text-xs text-[var(--color-brand)]">Open</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--color-ink)]/30"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
          <h2 id="drawer-title" className="text-sm font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

export { inputClass, labelClass };

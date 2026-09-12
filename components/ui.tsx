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
  "mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-ink-subtle)]";

const labelClass = "block text-sm font-medium text-[var(--color-ink)]";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className = "",
) {
  return `btn btn-${variant} btn-${size} ${className}`.trim();
}

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
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
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
    <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
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
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-10 text-center text-sm text-[var(--color-ink-muted)]">
      <div
        className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-brand)]"
        aria-hidden
      />
      {label}
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
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
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
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-10 text-center">
      {Icon ? (
        <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]">
          <Icon size={20} />
        </span>
      ) : null}
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
          {description}
        </p>
      )}
      {action}
      {!action && actionHref && actionLabel && (
        <div className="mt-4 flex justify-center">
          <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
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
      className="rounded-[var(--radius-md)] border border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] px-4 py-4 text-sm text-[var(--status-danger)]"
      role="alert"
    >
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-[var(--color-ink)]">{message}</p>
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
      <p className="text-[11px] font-medium text-[var(--color-ink-subtle)]">
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
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-ink)]">
      {title ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
          {title} · read-only
        </p>
      ) : (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
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
  if (!value) {
    return <span className="text-[var(--color-ink-subtle)]">—</span>;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return <span className="text-[var(--color-ink-subtle)]">—</span>;
  }
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="tabular-nums text-[var(--color-ink)]">
        {d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })}
      </span>
      {showTime && (
        <span className="text-xs tabular-nums text-[var(--color-ink-muted)]">
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
    default: "border-[var(--color-line)]",
    active: "border-[var(--status-success-ring)]",
    history: "border-[var(--color-line-strong)]",
  };
  const headers = {
    default:
      "border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]",
    active:
      "border-[var(--status-success-ring)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
    history:
      "border-[var(--color-line)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)]",
  };
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-md)] border bg-[var(--color-surface)] ${tones[tone]}`}
    >
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
      <div className="dialog-panel w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]">
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
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
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

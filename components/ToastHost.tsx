"use client";

import { useToast } from "@/lib/toast-context";

const TONE_CLASS: Record<string, string> = {
  success: "border-[var(--status-success-ring)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
  error: "border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
  info: "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]",
};

export function ToastHost() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-sm shadow-[var(--shadow-md)] ${TONE_CLASS[toast.tone]}`}
        >
          <p>{toast.message}</p>
          <button
            type="button"
            className="shrink-0 text-xs opacity-70 hover:opacity-100"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
          >
            Close
          </button>
        </div>
      ))}
    </div>
  );
}

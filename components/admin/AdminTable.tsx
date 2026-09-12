"use client";

import type { ReactNode } from "react";

export function AdminTable({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      {caption ? (
        <div className="border-b border-[var(--color-line)] px-4 py-2.5 text-sm text-[var(--color-ink-muted)]">
          {caption}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="data-table min-w-full">{children}</table>
      </div>
    </div>
  );
}

export function AdminTh({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`sticky top-0 bg-[var(--color-surface-2)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-subtle)] ${className}`}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className = "",
  onClick,
}: {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <td
      className={`px-4 py-3 align-middle text-sm text-[var(--color-ink)] ${className}`}
      onClick={onClick}
    >
      {children}
    </td>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";

export function AdminBreadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-ink-muted)]">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <span className="font-medium text-[var(--color-ink-subtle)]">
            Super Admin
          </span>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <span aria-hidden>/</span>
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-[var(--color-ink)]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-[var(--color-ink)]">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AdminPageShell({
  breadcrumb,
  title,
  description,
  actions,
  toolbar,
  children,
}: {
  breadcrumb: Array<{ label: string; href?: string }>;
  title: string;
  description: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <AdminBreadcrumb items={breadcrumb} />
      <PageHeader
        eyebrow="Administration"
        title={title}
        description={description}
        actions={actions}
      />
      {toolbar}
      {children}
    </div>
  );
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3">
      {children}
    </div>
  );
}

export function AdminResultCount({
  filtered,
  total,
  noun,
}: {
  filtered: number;
  total: number;
  noun: string;
}) {
  return (
    <p className="text-sm text-[var(--color-ink-muted)]">
      Showing{" "}
      <span className="font-medium text-[var(--color-ink)]">{filtered}</span>
      {filtered !== total ? (
        <>
          {" "}
          of <span className="font-medium text-[var(--color-ink)]">{total}</span>
        </>
      ) : null}{" "}
      {noun}
    </p>
  );
}

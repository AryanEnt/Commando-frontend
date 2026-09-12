"use client";

import Link from "next/link";
import {
  AdminPageShell,
} from "@/components/admin/AdminPageShell";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  {
    href: "/activity-types",
    title: "Activity Types",
    description: "Define coaching and monitoring activity categories.",
    permission: "ACTIVITY_TYPE_MANAGE",
  },
  {
    href: "/monitoring-checklists",
    title: "Monitoring Checklists",
    description: "Configure live monitoring checklist templates.",
    permission: "MONITORING_CHECKLIST_MANAGE",
  },
] as const;

export default function ConfigurationPage() {
  const { hasPermission } = useAuth();
  const items = LINKS.filter((item) => hasPermission(item.permission));

  return (
    <AdminPageShell
      breadcrumb={[{ label: "Configuration" }]}
      title="Configuration"
      description="Platform settings for coaching activities and monitoring."
    >
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">
          You do not have permission to manage configuration.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block px-4 py-4 hover:bg-[var(--color-surface-2)] focus-visible:bg-[var(--color-surface-2)]"
              >
                <span className="block text-sm font-medium text-[var(--color-ink)]">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-sm text-[var(--color-ink-muted)]">
                  {item.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}

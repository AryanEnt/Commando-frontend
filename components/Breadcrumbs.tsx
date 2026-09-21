"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ROUTE_LABELS } from "@/lib/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!pathname || pathname === "/" || pathname === "/login") return null;

  // SE workspace and Super Admin config pages use their own contextual breadcrumbs.
  if (/^\/profiles\/[^/]+/.test(pathname)) return null;
  if (
    pathname === "/configuration" ||
    pathname === "/activity-types" ||
    pathname === "/monitoring-checklists" ||
    pathname.startsWith("/audit-logs")
  ) {
    return null;
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1 && parts[0] === "dashboard") return null;

  const homeLabel =
    user?.roleCode === "SUPER_ADMIN"
      ? "Control Tower"
      : user?.roleCode === "SALES_SUPPORT_EXECUTIVE"
        ? "Dashboard"
        : user?.roleCode === "SALES_EXECUTIVE"
          ? "My workspace"
          : "Home";

  const crumbs = parts.map((part, index) => {
    const href = "/" + parts.slice(0, index + 1).join("/");
    const label =
      ROUTE_LABELS[part] ??
      (part.length > 18 ? `${part.slice(0, 8)}…` : part);
    const isLast = index === parts.length - 1;
    return { href, label, isLast };
  });

  // Super Admin: first crumb "dashboard" → Control Tower
  if (user?.roleCode === "SUPER_ADMIN" && crumbs[0]?.href === "/dashboard") {
    crumbs[0] = { ...crumbs[0], label: "Control Tower" };
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden min-w-0 text-meta md:block"
    >
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link
            href="/dashboard"
            className="transition hover:text-[var(--color-ink)]"
          >
            {homeLabel}
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <span aria-hidden className="text-[var(--color-ink-subtle)]">
              /
            </span>
            {crumb.isLast ? (
              <span className="truncate font-medium text-[var(--color-ink)]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="transition hover:text-[var(--color-ink)]"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

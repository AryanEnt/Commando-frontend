"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTE_LABELS } from "@/lib/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === "/" || pathname === "/login") return null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1 && parts[0] === "dashboard") return null;

  const crumbs = parts.map((part, index) => {
    const href = "/" + parts.slice(0, index + 1).join("/");
    const label =
      ROUTE_LABELS[part] ??
      (part.length > 18 ? `${part.slice(0, 8)}…` : part);
    const isLast = index === parts.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 text-sm text-[var(--color-ink-muted)] md:block">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/dashboard" className="hover:text-[var(--color-ink)]">
            Dashboard
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <span aria-hidden>/</span>
            {crumb.isLast ? (
              <span className="truncate font-medium text-[var(--color-ink)]">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-[var(--color-ink)]">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

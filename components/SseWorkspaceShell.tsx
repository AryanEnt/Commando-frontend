"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { SseWorkspaceSidebar } from "@/components/sse-workspace/SseWorkspaceSidebar";
import {
  Avatar,
  ErrorState,
  LoadingState,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useSseWorkspace } from "@/lib/sse-workspace-context";
import {
  sseFlatNavForRole,
  sseSectionFromPathname,
  sseSectionLabel,
  type SseSection,
} from "@/lib/sse-workspace-nav";

/**
 * Support Executive workspace chrome for TL / Commando — mirrors SeWorkspaceShell.
 */
export function SseWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { subject, loading, error } = useSseWorkspace();
  const section = sseSectionFromPathname(pathname);

  if (loading && !subject) {
    return <LoadingState label="Loading Sales Support…" />;
  }
  if (error && !subject) {
    return <ErrorState message={error} />;
  }
  if (!subject) {
    return <ErrorState message="Sales Support not found." />;
  }

  const roleCode = user?.roleCode ?? "COMMANDO_EXECUTIVE";
  const useContextualSidebar =
    roleCode === "COMMANDO_EXECUTIVE" ||
    roleCode === "TEAM_LEAD" ||
    roleCode === "SUPER_ADMIN";

  const sectionTitle =
    section === "overview" ? null : sseSectionLabel(section as SseSection);
  const flatNav = sseFlatNavForRole(roleCode);
  const linkCount = subject.links.length;
  const status = {
    status: linkCount > 0 ? "ON_TRACK" : "NEEDS_ATTENTION",
    label: linkCount > 0 ? "Linked" : "Unlinked",
  };

  if (!useContextualSidebar) {
    return (
      <div className="space-y-4">
        <nav aria-label="Breadcrumb" className="text-meta">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link
                href="/dashboard"
                className="transition hover:text-[var(--color-ink)]"
              >
                Dashboard
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <span aria-hidden className="text-[var(--color-ink-subtle)]">
                /
              </span>
              <Link
                href={`/support/${subject.userId}`}
                className="font-medium text-[var(--color-ink)]"
              >
                {subject.displayName}
              </Link>
            </li>
            {sectionTitle ? (
              <li className="flex items-center gap-1">
                <span aria-hidden className="text-[var(--color-ink-subtle)]">
                  /
                </span>
                <span className="font-medium text-[var(--color-ink)]">
                  {sectionTitle}
                </span>
              </li>
            ) : null}
          </ol>
        </nav>
        {children}
      </div>
    );
  }

  return (
    <div className="se-workspace-layout">
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-[calc(100dvh-var(--header-h))] lg:self-start">
        <SseWorkspaceSidebar
          userId={subject.userId}
          displayName={subject.displayName}
          teamName={subject.teamName}
          statusLabel={status.label}
          statusActive={linkCount > 0}
          section={section}
          roleCode={roleCode}
        />
      </div>

      <div className="se-workspace-main min-w-0 flex-1">
        <div className="space-y-4 px-4 py-5 sm:px-5 lg:px-6 lg:py-5">
          <nav aria-label="Breadcrumb" className="se-breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link
                  href={`/support/${subject.userId}`}
                  className={
                    section === "overview" ? "se-breadcrumb-current" : undefined
                  }
                >
                  {subject.displayName}
                </Link>
              </li>
              {sectionTitle ? (
                <li className="flex items-center gap-1">
                  <span aria-hidden>/</span>
                  <span className="se-breadcrumb-current">{sectionTitle}</span>
                </li>
              ) : null}
            </ol>
          </nav>

          {section !== "work-log" && section !== "actions" ? (
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Avatar name={subject.displayName} size="md" />
                  <div className="min-w-0">
                    <h1 className="truncate text-[1.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[1.35rem]">
                      {subject.displayName}
                    </h1>
                    <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
                      Sales Support Executive
                      {subject.teamName ? ` · ${subject.teamName}` : ""}
                      {subject.email ? ` · ${subject.email}` : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink)]">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      linkCount > 0
                        ? "bg-[var(--color-brand)]"
                        : "bg-[var(--color-ink-subtle)]"
                    }`}
                    aria-hidden
                  />
                  {status.label}
                  {linkCount > 0 ? (
                    <span className="font-normal text-[var(--color-ink-muted)]">
                      · {linkCount} linked SE{linkCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  <span className="sr-only">
                    <StatusBadge status={status.status} label={status.label} />
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          <div className="lg:hidden">
            <label className="sr-only" htmlFor="sse-workspace-section-mobile">
              Workspace section
            </label>
            <select
              id="sse-workspace-section-mobile"
              className={`${inputClass} w-full`}
              value={section}
              onChange={(e) => {
                const next = e.target.value as SseSection;
                const navItem = flatNav.find((n) => n.section === next);
                if (navItem) router.push(navItem.href(subject.userId));
              }}
            >
              {flatNav.map((navItem) => (
                <option key={navItem.section} value={navItem.section}>
                  {navItem.label}
                </option>
              ))}
            </select>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

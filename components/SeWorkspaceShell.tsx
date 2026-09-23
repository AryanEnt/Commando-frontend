"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { SeWorkspaceSidebar } from "@/components/se-workspace/SeWorkspaceSidebar";
import {
  Avatar,
  ErrorState,
  LoadingState,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useSeWorkspace } from "@/lib/se-workspace-context";
import { personName } from "@/lib/labels";
import {
  seCreateHref,
  seGroupedNavForRole,
  seNavForRole,
  seSectionFromPathname,
  seSectionLabel,
  type SeSection,
} from "@/lib/se-workspace-nav";

function workspaceStatus(opts: {
  assignment: boolean;
  healthStatus?: string | null;
  lastCompleted?: boolean;
}): { status: string; label: string } {
  if (opts.assignment) {
    return { status: "UNDER_INTERVENTION", label: "Active Intervention" };
  }
  if (opts.lastCompleted) {
    return { status: "COMPLETED", label: "Completed" };
  }
  const health = (opts.healthStatus ?? "ON_TRACK").toUpperCase();
  if (health === "NEEDS_ATTENTION") {
    return { status: "NEEDS_ATTENTION", label: "Under review" };
  }
  if (health === "AT_RISK") {
    return { status: "AT_RISK", label: "At risk" };
  }
  return { status: "ON_TRACK", label: "On track" };
}

/**
 * SE workspace chrome: contextual full-height sidebar for managers,
 * slim breadcrumbs for Sales Executives / Support.
 */
export function SeWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, workspace, loading, error, teamLeadLocked } =
    useSeWorkspace();
  const section = seSectionFromPathname(pathname);

  if (loading && !profile) {
    return <LoadingState label="Loading Sales Executive…" />;
  }
  if (error && !profile) {
    return <ErrorState message={error} />;
  }
  if (!profile) {
    return <ErrorState message="Sales Executive not found." />;
  }

  const roleCode = user?.roleCode ?? "COMMANDO_EXECUTIVE";
  const isSalesExecutive = roleCode === "SALES_EXECUTIVE";
  const useContextualSidebar =
    roleCode === "COMMANDO_EXECUTIVE" ||
    roleCode === "TEAM_LEAD" ||
    roleCode === "SUPER_ADMIN";

  const sectionTitle =
    section === "overview" ? null : seSectionLabel(section as SeSection);
  const flatNav = useContextualSidebar
    ? seGroupedNavForRole(roleCode).flatMap((g) => g.items)
    : seNavForRole(roleCode);
  const isCreateFlow = /\/profiles\/[^/]+\/[^/]+\/new(?:\/|$)/.test(pathname);
  const healthStatus = workspace?.health?.status;
  const assignment = profile.currentAssignment;
  const lastCompleted =
    !assignment &&
    profile.assignmentHistory.some((a) => a.status === "COMPLETED");
  const status = workspaceStatus({
    assignment: Boolean(assignment),
    healthStatus,
    lastCompleted,
  });
  const canAddDailyLog =
    useContextualSidebar &&
    roleCode !== "SUPER_ADMIN" &&
    !teamLeadLocked &&
    (roleCode === "TEAM_LEAD" || Boolean(assignment));

  if (isSalesExecutive) {
    return (
      <div className="space-y-3">
        {sectionTitle ? (
          <nav aria-label="Breadcrumb" className="se-breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href={`/profiles/${profile.id}`}>My workspace</Link>
              </li>
              <li className="flex items-center gap-1">
                <span aria-hidden>/</span>
                <span className="se-breadcrumb-current">{sectionTitle}</span>
              </li>
            </ol>
          </nav>
        ) : null}
        {children}
      </div>
    );
  }

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
                href={`/profiles/${profile.id}`}
                className="font-medium text-[var(--color-ink)]"
              >
                {profile.displayName}
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
        {!isCreateFlow ? (
          <div className="md:hidden">
            <label className="sr-only" htmlFor="se-workspace-section">
              Workspace section
            </label>
            <select
              id="se-workspace-section"
              className={`${inputClass} w-full`}
              value={section}
              onChange={(e) => {
                const next = e.target.value as SeSection;
                const navItem = flatNav.find((n) => n.section === next);
                if (navItem) router.push(navItem.href(profile.id));
              }}
            >
              {flatNav.map((navItem) => (
                <option key={navItem.section} value={navItem.section}>
                  {navItem.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <div className="se-workspace-layout">
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-[calc(100dvh-var(--header-h))] lg:self-start">
        <SeWorkspaceSidebar
          profileId={profile.id}
          displayName={profile.displayName}
          teamName={profile.team.name}
          statusLabel={status.label}
          statusActive={Boolean(assignment)}
          section={section}
          roleCode={roleCode}
          onAddDailyLog={
            canAddDailyLog
              ? () => router.push(seCreateHref(profile.id, "daily-log"))
              : undefined
          }
        />
      </div>

      <div
        className={`se-workspace-main min-w-0 flex-1${
          section === "reviews"
            ? " flex min-h-0 flex-col overflow-hidden"
            : ""
        }`}
      >
        {section === "reviews" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {teamLeadLocked ? (
              <div
                role="status"
                className="shrink-0 border-b border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] px-4 py-3 text-[var(--text-body)]"
              >
                <p className="font-medium text-[var(--color-ink)]">
                  Operational work paused
                </p>
                <p className="mt-1 text-[var(--color-ink-muted)]">
                  Active Commando intervention — Team Lead ownership remains;
                  conflicting writes are locked until the intervention ends.
                </p>
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </div>
        ) : (
        <div className="space-y-4 px-4 py-5 sm:px-5 lg:px-6 lg:py-5">
          <nav aria-label="Breadcrumb" className="se-breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link
                  href={`/profiles/${profile.id}`}
                  className={
                    section === "overview" ? "se-breadcrumb-current" : undefined
                  }
                >
                  {profile.displayName}
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

          {teamLeadLocked ? (
            <div
              role="status"
              className="rounded-[var(--radius-md)] border border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] px-4 py-3 text-[var(--text-body)]"
            >
              <p className="font-medium text-[var(--color-ink)]">
                Operational work paused
              </p>
              <p className="mt-1 text-[var(--color-ink-muted)]">
                Active Commando intervention — Team Lead ownership remains;
                conflicting writes are locked until the intervention ends.
              </p>
            </div>
          ) : null}

          {/* Checklist, Feedback, Assignments & Work Log own their headers. */}
          {section !== "checklist" &&
          section !== "feedback" &&
          section !== "actions" &&
          section !== "work-log" ? (
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Avatar name={profile.displayName} size="md" />
                  <div className="min-w-0">
                    <h1 className="truncate text-[1.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[1.35rem]">
                      {profile.displayName}
                    </h1>
                    <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
                      {profile.team.name}
                      {assignment?.teamLead
                        ? ` · Team Lead: ${personName(assignment.teamLead)}`
                        : ""}
                      {assignment?.commando
                        ? ` · Commando: ${personName(assignment.commando)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink)]">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      assignment
                        ? "bg-[var(--color-brand)]"
                        : "bg-[var(--color-ink-subtle)]"
                    }`}
                    aria-hidden
                  />
                  {status.label}
                  <span className="sr-only">
                    <StatusBadge status={status.status} label={status.label} />
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          {!isCreateFlow ? (
            <div className="lg:hidden">
              <label className="sr-only" htmlFor="se-workspace-section-mobile">
                Workspace section
              </label>
              <select
                id="se-workspace-section-mobile"
                className={`${inputClass} w-full`}
                value={section}
                onChange={(e) => {
                  const next = e.target.value as SeSection;
                  const navItem = flatNav.find((n) => n.section === next);
                  if (navItem) router.push(navItem.href(profile.id));
                }}
              >
                {flatNav.map((navItem) => (
                  <option key={navItem.section} value={navItem.section}>
                    {navItem.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {children}
        </div>
        )}
      </div>
    </div>
  );
}

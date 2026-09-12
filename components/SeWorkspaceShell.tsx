"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { personName } from "@/lib/labels";
import { useSeWorkspace } from "@/lib/se-workspace-context";
import {
  seNavForRole,
  seSectionFromPathname,
  seSectionLabel,
  type SeSection,
} from "@/lib/se-workspace-nav";

function profilesListHref() {
  if (typeof window === "undefined") return "/profiles";
  const q = sessionStorage.getItem("profilesListQuery");
  return q ? `/profiles?${q}` : "/profiles";
}

/**
 * Contextual SE workspace chrome for managers (Admin / TL / Commando / Support).
 * Global role sidebar stays unchanged — workspace tabs live here in main content.
 */
export function SeWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  const isSalesExecutive = user?.roleCode === "SALES_EXECUTIVE";
  const isSalesSupport = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";
  const listHref = profilesListHref();
  const homeHref = isSalesSupport ? "/dashboard" : listHref;
  const homeLabel = isSalesSupport ? "My workspace" : "Sales Executives";
  const sectionTitle =
    section === "overview" ? null : seSectionLabel(section as SeSection);
  const sectionNav = seNavForRole(user?.roleCode ?? "COMMANDO_EXECUTIVE");
  const isCreateFlow = /\/profiles\/[^/]+\/[^/]+\/new(?:\/|$)/.test(pathname);
  // Managers: contextual tabs in content. SE: tabs live in global sidebar only.
  const showWorkspaceTabs = !isSalesExecutive && !isCreateFlow;
  const healthStatus = workspace?.health?.status;
  const teamLeadName = profile.currentAssignment
    ? personName(profile.currentAssignment.teamLead)
    : profile.assignmentHistory[0]
      ? personName(profile.assignmentHistory[0].teamLead)
      : null;

  return (
    <div className="space-y-4">
      <nav
        aria-label="Breadcrumb"
        className="text-sm text-[var(--color-ink-muted)]"
      >
        <ol className="flex flex-wrap items-center gap-1">
          {isSalesExecutive ? (
            <li>
              <Link
                href={`/profiles/${profile.id}`}
                className={
                  section === "overview"
                    ? "font-medium text-[var(--color-ink)]"
                    : "hover:text-[var(--color-ink)]"
                }
              >
                My workspace
              </Link>
            </li>
          ) : (
            <>
              <li>
                <Link href={homeHref} className="hover:text-[var(--color-ink)]">
                  {homeLabel}
                </Link>
              </li>
              <li className="flex items-center gap-1">
                <span aria-hidden>/</span>
                <Link
                  href={`/profiles/${profile.id}`}
                  className={
                    section === "overview"
                      ? "font-medium text-[var(--color-ink)]"
                      : "hover:text-[var(--color-ink)]"
                  }
                >
                  {profile.displayName}
                </Link>
              </li>
            </>
          )}
          {sectionTitle && (
            <li className="flex items-center gap-1">
              <span aria-hidden>/</span>
              <span className="font-medium text-[var(--color-ink)]">
                {sectionTitle}
              </span>
            </li>
          )}
        </ol>
      </nav>

      {teamLeadLocked ? (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] px-4 py-3 text-sm"
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

      {showWorkspaceTabs ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Link
                href={homeHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
              >
                <ArrowLeft size={13} aria-hidden />
                Back to {homeLabel}
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                  {profile.displayName}
                </h1>
                {healthStatus ? (
                  <StatusBadge
                    status={healthStatus}
                    label={healthStatus.replaceAll("_", " ")}
                  />
                ) : profile.currentAssignment ? (
                  <StatusBadge
                    status="UNDER_INTERVENTION"
                    label="Under intervention"
                  />
                ) : (
                  <StatusBadge
                    status="NORMAL_MANAGEMENT"
                    label="Normal management"
                  />
                )}
              </div>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                Sales Executive · {profile.team.name}
                {teamLeadName ? ` · TL ${teamLeadName}` : ""}
              </p>
            </div>
          </div>

          <nav
            aria-label={`${profile.displayName} workspace`}
            className="overflow-x-auto border-t border-[var(--color-line)]"
          >
            <ul className="flex min-w-max gap-0 px-2 sm:px-3">
              {sectionNav.map((item) => {
                const href = item.href(profile.id);
                const active = item.section === section;
                return (
                  <li key={item.section}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`relative block whitespace-nowrap rounded-t-[var(--radius-sm)] px-3 py-2.5 text-sm transition ${
                        active
                          ? "bg-[var(--color-brand-soft)] font-semibold text-[var(--color-brand)]"
                          : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {item.label}
                      {active ? (
                        <span
                          className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-brand)]"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}

      {children}
    </div>
  );
}

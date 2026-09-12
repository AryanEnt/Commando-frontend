"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, ErrorState, LoadingState } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
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

function healthLabel(status: string | undefined) {
  if (!status) return null;
  return status.replaceAll("_", " ");
}

export function SeWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const { profile, workspace, supportTeam, loading, error, teamLeadLocked } =
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

  // Keep SE header + breadcrumbs on create flows so the workspace stays fixed.
  const assignment = profile.currentAssignment;
  const isSalesExecutive = user?.roleCode === "SALES_EXECUTIVE";
  const isSalesSupport = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";
  const listHref = profilesListHref();
  const homeHref = isSalesSupport ? "/dashboard" : listHref;
  const homeLabel = isSalesSupport ? "My workspace" : "Sales Executives";
  const showTeamLead =
    user?.roleCode === "COMMANDO_EXECUTIVE" ||
    user?.roleCode === "SUPER_ADMIN" ||
    user?.roleCode === "TEAM_LEAD" ||
    user?.roleCode === "SALES_EXECUTIVE";
  const canViewSupport = hasPermission("SALES_SUPPORT_LINK_VIEW");
  const teamLeadName = assignment
    ? personName(assignment.teamLead)
    : profile.assignmentHistory[0]
      ? personName(profile.assignmentHistory[0].teamLead)
      : null;
  const health = healthLabel(workspace?.health?.status);
  const sectionTitle =
    section === "overview" ? null : seSectionLabel(section as SeSection);
  const supportNames =
    supportTeam?.activeSupport
      ?.map((link) => personName(link.supportUser))
      .filter(Boolean) ?? [];
  const showSupportRow = canViewSupport && supportTeam !== null;
  const daysUnderCommando = assignment
    ? (workspace?.daysInIntervention ?? assignment.totalDaysUnderCommando)
    : null;
  const sectionNav = seNavForRole(user?.roleCode ?? "COMMANDO_EXECUTIVE");
  const isCreateFlow = /\/profiles\/[^/]+\/[^/]+\/new(?:\/|$)/.test(pathname);

  return (
    <div className="space-y-5">
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
          className="border border-[var(--color-attention)]/40 bg-[var(--color-attention)]/10 px-4 py-3 text-sm"
        >
          <p className="font-medium">Operational work paused</p>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            Active Commando intervention — Team Lead ownership remains;
            conflicting writes are locked until the intervention ends.
          </p>
        </div>
      ) : null}

      <header className="border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <Avatar name={profile.displayName} size="lg" />
              <div className="min-w-0 space-y-3">
                <div>
                  <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
                    {profile.displayName}
                  </h1>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                    Sales Executive, {profile.team.name}
                  </p>
                </div>

                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {health ? (
                    <div>
                      <dt className="text-xs font-medium text-[var(--color-ink-subtle)]">
                        Status
                      </dt>
                      <dd className="mt-0.5 font-semibold text-[var(--color-ink)]">
                        {health}
                      </dd>
                    </div>
                  ) : null}
                  {showTeamLead ? (
                    <div>
                      <dt className="text-xs font-medium text-[var(--color-ink-subtle)]">
                        Team Lead
                      </dt>
                      <dd className="mt-0.5 font-semibold text-[var(--color-ink)]">
                        {teamLeadName ?? "—"}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-ink-subtle)]">
                      Commando
                    </dt>
                    <dd className="mt-0.5 font-semibold text-[var(--color-ink)]">
                      {assignment
                        ? personName(assignment.commando)
                        : "No active Commando assigned"}
                    </dd>
                  </div>
                  {daysUnderCommando != null ? (
                    <div>
                      <dt className="text-xs font-medium text-[var(--color-ink-subtle)]">
                        Days under Commando
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-[var(--color-ink)]">
                        {daysUnderCommando}{" "}
                        {daysUnderCommando === 1 ? "day" : "days"}
                      </dd>
                    </div>
                  ) : null}
                  {showSupportRow ? (
                    <div>
                      <dt className="text-xs font-medium text-[var(--color-ink-subtle)]">
                        Support
                      </dt>
                      <dd className="mt-0.5 font-semibold text-[var(--color-ink)]">
                        {supportNames.length > 0
                          ? supportNames.join(" · ")
                          : "None"}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              {assignment ? (
                <>
                  <StatusBadge
                    status="UNDER_INTERVENTION"
                    label="Under intervention"
                  />
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {personName(assignment.commando)}
                    {assignment.startedAt
                      ? ` — Since ${formatDate(assignment.startedAt)}`
                      : ""}
                  </p>
                </>
              ) : isSalesExecutive ? (
                <>
                  <StatusBadge
                    status="NORMAL_MANAGEMENT"
                    label="Normal management"
                  />
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Managed by your Team Lead
                  </p>
                </>
              ) : (
                <>
                  <StatusBadge
                    status="NORMAL_MANAGEMENT"
                    label="Normal management"
                  />
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    No active Commando intervention
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {!isCreateFlow ? (
          <nav
            aria-label={`${profile.displayName} sections`}
            className="-mx-px overflow-x-auto border-t border-[var(--color-line)]"
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
                      className={`relative block whitespace-nowrap px-3 py-2.5 text-sm transition ${
                        active
                          ? "font-semibold text-[var(--color-ink)]"
                          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
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
        ) : null}
      </header>

      {children}
    </div>
  );
}

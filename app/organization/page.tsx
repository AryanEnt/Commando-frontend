"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type OrganizationStructure } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName, roleLabel } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SegmentedControl,
  Skeleton,
  TextInput,
} from "@/components/ui";

type OrgTeam = OrganizationStructure["teams"][number];
type FocusFilter = "all" | "active" | "idle" | "no_lead";

function teamHasMatch(team: OrgTeam, q: string) {
  if (!q) return true;
  const hay = [
    team.name,
    team.description ?? "",
    ...team.teamLeads.map((m) => `${personName(m.user)} ${m.user.email}`),
    ...team.salesSupport.map((m) => `${personName(m.user)} ${m.user.email}`),
    ...team.otherMembers.map((m) => `${personName(m.user)} ${m.user.email}`),
    ...team.salesExecutives.map((se) => se.displayName),
    ...team.salesExecutives.map((se) => se.user.email),
    ...team.salesExecutives.flatMap((se) =>
      se.currentAssignment
        ? [
            personName(se.currentAssignment.commando),
            personName(se.currentAssignment.teamLead),
          ]
        : [],
    ),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function teamMatchesFocus(team: OrgTeam, focus: FocusFilter) {
  if (focus === "all") return true;
  if (focus === "no_lead") return team.teamLeads.length === 0;
  if (focus === "active") {
    return team.salesExecutives.some((se) => se.currentAssignment);
  }
  return team.salesExecutives.some((se) => !se.currentAssignment);
}

function PersonRow({
  href,
  name,
  email,
  status,
  meta,
}: {
  href?: string;
  name: string;
  email?: string;
  status?: string;
  meta?: string;
}) {
  const title = href ? (
    <Link
      href={href}
      className="font-medium text-[var(--color-ink)] hover:text-[var(--color-brand)] hover:underline"
    >
      {name}
    </Link>
  ) : (
    <span className="font-medium text-[var(--color-ink)]">{name}</span>
  );

  return (
    <div className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="min-w-0">
        {title}
        {email ? (
          <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">
            {email}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">{meta}</p>
        ) : null}
      </div>
      {status ? <StatusBadge status={status} /> : null}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn" | "success";
}) {
  const tones = {
    default: "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]",
    warn: "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] text-[var(--status-warn)]",
    success:
      "border-[var(--status-success-ring)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
  };
  return (
    <div
      className={`min-w-[7.5rem] flex-1 rounded-[var(--radius-md)] border px-3.5 py-3 ${tones[tone]}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function TeamCard({ team, defaultOpen }: { team: OrgTeam; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const activeCount = team.salesExecutives.filter((se) => se.currentAssignment).length;
  const idleCount = team.salesExecutives.length - activeCount;
  const missingLead = team.teamLeads.length === 0;

  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--color-surface-2)]"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              {team.name}
            </h2>
            {missingLead ? (
              <StatusBadge status="PENDING" label="No Team Lead" />
            ) : null}
          </div>
          {team.description ? (
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {team.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-ink-muted)]">
            <span>
              {team.salesExecutives.length} Sales Executive
              {team.salesExecutives.length === 1 ? "" : "s"}
            </span>
            <span>{activeCount} in intervention</span>
            {idleCount > 0 ? <span>{idleCount} without intervention</span> : null}
            {team.salesSupport.length > 0 ? (
              <span>
                {team.salesSupport.length} support
              </span>
            ) : null}
          </div>
        </div>
        <span className="mt-1 shrink-0 text-xs font-medium text-[var(--color-ink-muted)]">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-[var(--color-line)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
            <aside className="space-y-5 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] p-5 lg:border-b-0 lg:border-r">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                  Team Lead
                </p>
                {team.teamLeads.length === 0 ? (
                  <p className="mt-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line-strong)] px-3 py-3 text-sm text-[var(--color-ink-muted)]">
                    No Team Lead assigned. Add one from the team page.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {team.teamLeads.map((m) => (
                      <li key={m.membershipId}>
                        <PersonRow
                          href={`/users/${m.user.id}`}
                          name={personName(m.user)}
                          email={m.user.email}
                          status={m.user.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {team.salesSupport.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                    Sales Support
                  </p>
                  <ul className="mt-2 space-y-2">
                    {team.salesSupport.map((m) => (
                      <li key={m.membershipId}>
                        <PersonRow
                          href={`/users/${m.user.id}`}
                          name={personName(m.user)}
                          email={m.user.email}
                          status={m.user.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {team.otherMembers.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                    Other members
                  </p>
                  <ul className="mt-2 space-y-2">
                    {team.otherMembers.map((m) => (
                      <li key={m.membershipId}>
                        <PersonRow
                          href={`/users/${m.user.id}`}
                          name={personName(m.user)}
                          email={m.user.email}
                          meta={roleLabel(m.roleInTeam || m.user.role.code)}
                          status={m.user.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Link
                href={`/teams/${team.id}`}
                className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
              >
                Open team settings
              </Link>
            </aside>

            <div className="p-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                    Sales Executives
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                    Current intervention chain: Team Lead → Commando → Sales
                    Executive
                  </p>
                </div>
              </div>

              {team.salesExecutives.length === 0 ? (
                <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line-strong)] px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    No Sales Executive profiles
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                    Onboard a Sales Executive to see them in this team.
                  </p>
                  <Link
                    href="/users/sales-executives/new"
                    className="mt-3 inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
                  >
                    Onboard Sales Executive
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-sm)] border border-[var(--color-line)]">
                  {team.salesExecutives.map((se) => {
                    const assignment = se.currentAssignment;
                    return (
                      <li
                        key={se.id}
                        className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/profiles/${se.id}`}
                            className="font-medium text-[var(--color-ink)] hover:text-[var(--color-brand)] hover:underline"
                          >
                            {se.displayName}
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">
                            {se.user.email}
                            {se.employeeCode ? ` · ${se.employeeCode}` : ""}
                          </p>
                        </div>

                        <div className="min-w-0 text-sm">
                          {assignment ? (
                            <div className="space-y-1 text-[var(--color-ink-muted)]">
                              <p>
                                <span className="text-[var(--color-ink-subtle)]">
                                  Commando ·{" "}
                                </span>
                                <Link
                                  href={`/users/${assignment.commando.id}`}
                                  className="font-medium text-[var(--color-ink)] hover:underline"
                                >
                                  {personName(assignment.commando)}
                                </Link>
                              </p>
                              <p>
                                <span className="text-[var(--color-ink-subtle)]">
                                  Team Lead ·{" "}
                                </span>
                                <Link
                                  href={`/users/${assignment.teamLead.id}`}
                                  className="font-medium text-[var(--color-ink)] hover:underline"
                                >
                                  {personName(assignment.teamLead)}
                                </Link>
                              </p>
                            </div>
                          ) : (
                            <p className="text-[var(--color-ink-muted)]">
                              No active intervention
                            </p>
                          )}
                        </div>

                        <div className="sm:justify-self-end">
                          {assignment ? (
                            <Link href={`/assignments/${assignment.id}`}>
                              <StatusBadge status={assignment.status} />
                            </Link>
                          ) : (
                            <StatusBadge
                              status="INACTIVE"
                              label="No intervention"
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function OrganizationPage() {
  const { token, user, hasPermission } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrganizationStructure | null>(null);
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState<FocusFilter>("all");

  const isTeamLead = user?.roleCode === "TEAM_LEAD";
  const allowed =
    (user?.roleCode === "SUPER_ADMIN" || isTeamLead) &&
    hasPermission("TEAM_VIEW");

  const load = useCallback(async () => {
    if (!token || !allowed) return;
    setState("loading");
    setError(null);
    try {
      const res = await api.getOrganizationStructure(token);
      setData(res.data);
      setState("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load organization",
      );
      setState("error");
    }
  }, [token, allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    if (!data) return null;
    let salesExecutives = 0;
    let activeInterventions = 0;
    let missingLeads = 0;
    for (const team of data.teams) {
      salesExecutives += team.salesExecutives.length;
      activeInterventions += team.salesExecutives.filter(
        (se) => se.currentAssignment,
      ).length;
      if (team.teamLeads.length === 0) missingLeads += 1;
    }
    return {
      teams: data.teams.length,
      salesExecutives,
      activeInterventions,
      idle: salesExecutives - activeInterventions,
      missingLeads,
    };
  }, [data]);

  const teams = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.teams.filter(
      (team) => teamHasMatch(team, q) && teamMatchesFocus(team, focus),
    );
  }, [data, search, focus]);

  if (!allowed) {
    return (
      <ErrorState message="Only Super Admin or Team Lead may view the organization structure." />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="People"
        title="Organization"
        description={
          isTeamLead
            ? "See Team Leads, Commandos, and Sales Executives for the teams you lead."
            : "See how Team Leads, Commandos, and Sales Executives are structured across every team."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {hasPermission("SALES_EXECUTIVE_CREATE") ? (
              <Link
                href="/users/sales-executives/new"
                className="btn btn-secondary btn-sm"
              >
                Onboard Sales Executive
              </Link>
            ) : null}
            <Link href="/teams" className="btn btn-primary btn-sm">
              {isTeamLead ? "My teams" : "Manage teams"}
            </Link>
          </div>
        }
      />

      {state === "loading" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-20 w-36" />
            <Skeleton className="h-20 w-36" />
            <Skeleton className="h-20 w-36" />
            <Skeleton className="h-20 w-36" />
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && summary && (
        <>
          <div className="flex flex-wrap gap-3">
            <StatPill label="Teams" value={summary.teams} />
            <StatPill label="Sales Executives" value={summary.salesExecutives} />
            <StatPill
              label="In intervention"
              value={summary.activeInterventions}
              tone="success"
            />
            <StatPill
              label="Missing Team Lead"
              value={summary.missingLeads}
              tone={summary.missingLeads > 0 ? "warn" : "default"}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="min-w-[14rem] flex-1">
              <TextInput
                label="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Team, lead, Commando, or Sales Executive…"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--color-ink)]">
                Focus
              </p>
              <SegmentedControl
                ariaLabel="Organization focus filter"
                value={focus}
                onChange={setFocus}
                options={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "idle", label: "Idle" },
                  { value: "no_lead", label: "No lead" },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Showing{" "}
              <span className="font-medium text-[var(--color-ink)]">
                {teams.length}
              </span>{" "}
              of {summary.teams} team{summary.teams === 1 ? "" : "s"}
            </p>
            {(search || focus !== "all") && (
              <button
                type="button"
                className="text-sm font-medium text-[var(--color-brand)] hover:underline"
                onClick={() => {
                  setSearch("");
                  setFocus("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {teams.length === 0 ? (
            <EmptyState
              title={
                summary.teams === 0
                  ? "No teams yet"
                  : "No teams match these filters"
              }
              description={
                summary.teams === 0
                  ? "Create a team, then assign Team Leads and Sales Executives."
                  : "Try another search or clear the focus filter."
              }
              actionHref={summary.teams === 0 ? "/teams" : undefined}
              actionLabel={summary.teams === 0 ? "Manage teams" : undefined}
            />
          ) : (
            <div className="space-y-4">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  defaultOpen={teams.length <= 4}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

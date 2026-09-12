"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Plus, UsersRound } from "lucide-react";
import { api, type ProfileListItem, type Referral } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { greeting, personName } from "@/lib/labels";
import { isPendingTeamLeadReview } from "@/lib/referral-phase";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  ButtonLink,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";

type LoadState = "loading" | "ready" | "error";

function submittedLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Submitted today · ${time}`;
  if (diff === 1) return `Submitted yesterday · ${time}`;
  return `Submitted ${formatDate(iso)}`;
}

function TeamLeadSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading team dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-8 w-10" />
          </div>
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function RequestCard({ referral }: { referral: Referral }) {
  const reason =
    referral.requestReason?.trim() ||
    referral.supportRequiredFromCommando?.trim() ||
    null;

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--status-warn-ring)] bg-[var(--color-surface)] p-4 transition duration-200 hover:border-[var(--status-warn)]/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--status-warn)]">
            <span className="status-dot" aria-hidden />
            Action required
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--color-ink-muted)]">
            Commando request
          </p>

          <div className="mt-3 flex items-start gap-3">
            <Avatar name={referral.profileName} size="md" />
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
                {referral.profileName}
              </h3>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {referral.team.name}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]">
            <span className="font-medium">
              {personName(referral.commando)}
            </span>{" "}
            has requested to work with {referral.profileName}.
          </p>
          {reason ? (
            <p className="mt-1.5 line-clamp-2 text-xs text-[var(--color-ink-muted)]">
              {reason}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
            {submittedLabel(referral.createdAt)} · Awaiting your decision
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={`/referrals/${referral.id}`} size="sm">
          Review request
        </ButtonLink>
        <ButtonLink
          href={`/profiles/${referral.salesExecutiveProfileId}`}
          variant="secondary"
          size="sm"
        >
          View profile
        </ButtonLink>
      </div>
    </article>
  );
}

function CoveragePanel({
  total,
  underCommando,
}: {
  total: number;
  underCommando: number;
}) {
  const normal = Math.max(0, total - underCommando);
  const normalPct = total > 0 ? Math.round((normal / total) * 100) : 0;
  const commandoPct = total > 0 ? Math.round((underCommando / total) * 100) : 0;

  return (
    <section
      aria-labelledby="coverage-heading"
      className="h-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5"
    >
      <h2
        id="coverage-heading"
        className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
      >
        Commando coverage
      </h2>
      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
        How your Sales Executives are managed right now
      </p>

      {total === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          Add Sales Executives to see coverage across your team.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-[var(--color-canvas-2)]">
            {normal > 0 ? (
              <div
                className="bg-[var(--status-info)]"
                style={{ width: `${normalPct}%` }}
                title={`${normal} under normal management`}
              />
            ) : null}
            {underCommando > 0 ? (
              <div
                className="bg-[var(--color-brand)]"
                style={{ width: `${commandoPct}%` }}
                title={`${underCommando} under Commando`}
              />
            ) : null}
          </div>

          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[var(--color-ink-muted)]">
                <span
                  className="h-2 w-2 rounded-full bg-[var(--status-info)]"
                  aria-hidden
                />
                Normal management
              </span>
              <span className="font-semibold tabular-nums text-[var(--color-ink)]">
                {normal}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[var(--color-ink-muted)]">
                <span
                  className="h-2 w-2 rounded-full bg-[var(--color-brand)]"
                  aria-hidden
                />
                Under Commando
              </span>
              <span className="font-semibold tabular-nums text-[var(--color-ink)]">
                {underCommando}
              </span>
            </li>
          </ul>

          {underCommando === 0 ? (
            <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              No active Commando assignments. Sales Executives on your team are
              currently under normal management.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function TeamLeadDashboard({
  token,
  firstName,
}: {
  token: string;
  firstName: string;
  roleCode?: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    teams: 0,
    profiles: 0,
    pendingReferrals: 0,
    activeAssignments: 0,
  });
  const [pending, setPending] = useState<Referral[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<ProfileListItem[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [teams, profiles, pendingRes, assignments] = await Promise.all([
        api.getTeams(token),
        api.getProfiles(token),
        api.getReferrals(token, { status: "SUBMITTED", pageSize: 20 }),
        api.getAssignments(token, { currentOnly: true }),
      ]);

      const awaitingReview = pendingRes.data.referrals.filter(
        isPendingTeamLeadReview,
      );

      setStats({
        teams: teams.data.teams.length,
        profiles: profiles.data.total,
        pendingReferrals: awaitingReview.length,
        activeAssignments: assignments.data.total,
      });
      setPending(awaitingReview);
      setTeamProfiles(profiles.data.profiles);
      setState("ready");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load this dashboard. Please try again.",
      );
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const overviewMetrics = [
    {
      label: "Teams",
      value: stats.teams,
      href: "/teams",
      hint: "Teams you lead",
    },
    {
      label: "Sales Executives",
      value: stats.profiles,
      href: "/profiles",
      hint: "In your scope",
    },
    {
      label: "Pending requests",
      value: stats.pendingReferrals,
      href: "/referrals?status=SUBMITTED",
      hint: "Awaiting your review",
      emphasize: stats.pendingReferrals > 0,
    },
    {
      label: "Active Commando",
      value: stats.activeAssignments,
      href: "/assignments?currentOnly=true",
      hint: "Assignments now",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.025em] text-[var(--color-ink)] sm:text-[1.625rem]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Here&apos;s what&apos;s happening across your team today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href="/users/sales-executives/new"
            variant="secondary"
            size="sm"
          >
            <Plus size={14} aria-hidden />
            Add Sales Executive
          </ButtonLink>
          <ButtonLink href="/users/new" variant="secondary" size="sm">
            <Plus size={14} aria-hidden />
            Add Sales Support
          </ButtonLink>
        </div>
      </header>

      {state === "loading" && <TeamLeadSkeleton />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && (
        <>
          <section aria-labelledby="team-overview-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2
                  id="team-overview-heading"
                  className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
                >
                  Team overview
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                  Coverage and decisions across your teams
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {overviewMetrics.map((m) => (
                <Link
                  key={m.label}
                  href={m.href}
                  className={`rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3.5 py-3 transition duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                    m.emphasize
                      ? "border-[var(--status-warn-ring)]"
                      : "border-[var(--color-line)]"
                  }`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                    {m.label}
                  </p>
                  <p
                    className={`mt-1.5 text-[1.75rem] font-semibold tabular-nums leading-none tracking-tight ${
                      m.emphasize
                        ? "text-[var(--status-warn)]"
                        : "text-[var(--color-ink)]"
                    }`}
                  >
                    {m.value}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[var(--color-ink-muted)]">
                    {m.hint}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
            <section
              aria-labelledby="requests-heading"
              className="lg:col-span-7"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2
                    id="requests-heading"
                    className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
                  >
                    Requests awaiting your review
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                    Commando requests that need your decision
                  </p>
                </div>
                {pending.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-warn-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--status-warn)]">
                    <span className="status-dot" aria-hidden />
                    {pending.length}
                  </span>
                ) : null}
              </div>

              {pending.length === 0 ? (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]">
                      <CheckCircle2 size={16} aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--status-success)]">
                        All caught up
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                        No Commando requests are waiting for your review.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((r) => (
                    <RequestCard key={r.id} referral={r} />
                  ))}
                </div>
              )}
            </section>

            <div className="lg:col-span-5">
              <CoveragePanel
                total={stats.profiles}
                underCommando={stats.activeAssignments}
              />
            </div>
          </div>

          <section aria-labelledby="se-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="se-heading"
                  className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
                >
                  My Sales Executives
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                  {stats.profiles} Sales Executive
                  {stats.profiles === 1 ? "" : "s"} in scope
                </p>
              </div>
              {stats.profiles > 0 ? (
                <Link
                  href="/profiles"
                  className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                >
                  View all →
                </Link>
              ) : null}
            </div>

            {teamProfiles.length === 0 ? (
              <EmptyState
                title="No Sales Executives yet"
                description="Add a Sales Executive to start building your team."
                actionHref="/users/sales-executives/new"
                actionLabel="Add Sales Executive"
                icon="emptyUsers"
              />
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                <ul className="divide-y divide-[var(--color-line)]">
                  {teamProfiles.slice(0, 8).map((p) => {
                    const assignment = p.currentAssignment;
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/profiles/${p.id}`}
                          className="group flex items-center gap-3 px-4 py-3.5 transition duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
                        >
                          <Avatar name={p.displayName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                                {p.displayName}
                              </p>
                              {assignment ? (
                                <StatusBadge
                                  status="UNDER_INTERVENTION"
                                  label="Under Commando"
                                />
                              ) : (
                                <StatusBadge
                                  status="NORMAL_MANAGEMENT"
                                  label="Normal management"
                                />
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">
                              Sales Executive · {p.team.name}
                              {assignment
                                ? ` · ${personName(assignment.commando)} · ${assignment.totalDaysUnderCommando}d`
                                : " · Commando: none assigned"}
                            </p>
                          </div>
                          <ArrowRight
                            size={14}
                            className="shrink-0 text-[var(--color-ink-subtle)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {stats.teams > 0 && teamProfiles.length > 0 ? (
            <section
              aria-labelledby="structure-heading"
              className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5"
            >
              <div className="flex items-center gap-2">
                <UsersRound
                  size={15}
                  className="text-[var(--color-ink-muted)]"
                  aria-hidden
                />
                <h2
                  id="structure-heading"
                  className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
                >
                  Team structure snapshot
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                Based on your current Sales Executives and assignments
              </p>
              <ul className="mt-4 space-y-3">
                {teamProfiles.slice(0, 3).map((p) => (
                  <li
                    key={p.id}
                    className="rounded-[var(--radius-sm)] bg-[var(--color-canvas)] px-3 py-2.5 text-sm"
                  >
                    <p className="font-medium text-[var(--color-ink)]">
                      You
                    </p>
                    <p className="mt-1 text-[var(--color-ink-muted)]">
                      ↓ {p.team.name}
                    </p>
                    {p.currentAssignment ? (
                      <>
                        <p className="mt-1 text-[var(--color-ink-muted)]">
                          ↓ {personName(p.currentAssignment.commando)}{" "}
                          <span className="text-[11px] text-[var(--color-ink-subtle)]">
                            Commando
                          </span>
                        </p>
                        <p className="mt-1 text-[var(--color-ink)]">
                          ↓ {p.displayName}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-[var(--color-ink)]">
                        ↓ {p.displayName}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

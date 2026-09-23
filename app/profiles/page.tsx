"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { api, type ProfileListItem, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SelectField,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function ProfilesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading Sales Executives…" />}>
      <ProfilesPageInner />
    </Suspense>
  );
}

function ProfilesPageInner() {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [includeHistory, setIncludeHistory] = useState(
    searchParams.get("includeHistory") === "1",
  );
  const [page, setPage] = useState(
    Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
  );
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<
    { id: string; email: string; firstName: string; lastName: string; role: { code: string } }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Individual roles don't use the roster — AppShell also redirects.
  useEffect(() => {
    if (!token) return;
    if (user?.roleCode === "SALES_EXECUTIVE") {
      let cancelled = false;
      void api.getProfiles(token, { pageSize: 1 }).then((res) => {
        const id = res.data.profiles[0]?.id;
        if (!cancelled && id) router.replace(`/profiles/${id}`);
      });
      return () => {
        cancelled = true;
      };
    }
    if (user?.roleCode === "SALES_SUPPORT_EXECUTIVE") {
      router.replace("/dashboard");
    }
  }, [user?.roleCode, token, router]);

  const [form, setForm] = useState({
    userId: "",
    teamId: "",
    displayName: "",
    employeeCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<{
    assignmentId: string;
    profileName: string;
  } | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const isSuperAdmin = user?.roleCode === "SUPER_ADMIN";
  const isTeamLead = user?.roleCode === "TEAM_LEAD";
  const isCommando = user?.roleCode === "COMMANDO_EXECUTIVE";
  const canCompleteIntervention = hasPermission("ASSIGNMENT_UPDATE");
  const canOnboardSe =
    hasPermission("SALES_EXECUTIVE_CREATE") ||
    isTeamLead ||
    isSuperAdmin;
  const canCreateSupport =
    hasPermission("SALES_SUPPORT_CREATE") || isTeamLead;
  /** Super Admin / Team Lead onboard via wizard — not the operational create-profile form. */
  const canCreateProfile =
    hasPermission("PROFILE_MANAGE") && !isSuperAdmin && !isTeamLead;

  const availableUsers = users.filter(
    (u) =>
      u.role.code === "SALES_EXECUTIVE" &&
      !profiles.some((p) => p.user.id === u.id),
  );

  async function load(q?: string, pageToLoad = page) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getProfiles(token, {
        search: q || undefined,
        includeHistory: user?.roleCode === "COMMANDO_EXECUTIVE" ? includeHistory : undefined,
        page: pageToLoad,
        pageSize,
      });
      setProfiles(res.data.profiles);
      setTotal(res.data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => {
      void load(search);
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, includeHistory, page, pageSize]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (includeHistory) params.set("includeHistory", "1");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    try {
      if (qs) sessionStorage.setItem("profilesListQuery", qs);
      else sessionStorage.removeItem("profilesListQuery");
    } catch {
      /* ignore */
    }
    const current = searchParams.toString();
    if (qs !== current) {
      router.replace(qs ? `/profiles?${qs}` : "/profiles", { scroll: false });
    }
  }, [search, includeHistory, page, router, searchParams]);

  useEffect(() => {
    if (!token || !canCreateProfile) return;
    Promise.all([api.getTeams(token), api.getUsers(token)]).then(
      ([teamsRes, usersRes]) => {
        setTeams(teamsRes.data.teams);
        setUsers(usersRes.data.users);
      },
    );
  }, [token, canCreateProfile]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.userId) next.userId = "Select a Sales Executive user";
    if (!form.teamId) next.teamId = "Select a team";
    if (!form.displayName.trim()) next.displayName = "Display name is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createProfile(token, {
        userId: form.userId,
        teamId: form.teamId,
        displayName: form.displayName.trim(),
        employeeCode: form.employeeCode.trim() || undefined,
      });
      pushToast("Profile created", "success");
      setForm({ userId: "", teamId: "", displayName: "", employeeCode: "" });
      setFieldErrors({});
      await load(search);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message === "Request validation failed"
            ? "Check the required fields and try again."
            : err.message
          : "Failed to create profile";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function completeIntervention() {
    if (!token || !completeTarget) return;
    setCompleteBusy(true);
    setError(null);
    try {
      await api.endAssignment(token, completeTarget.assignmentId, {
        status: "COMPLETED",
        completionReason: "Intervention completed from Sales Executives list",
      });
      pushToast(
        `Intervention completed for ${completeTarget.profileName}`,
        "success",
      );
      setCompleteTarget(null);
      await load(search);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not complete the intervention";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setCompleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Sales Executives"
        description={
          isSuperAdmin
            ? "Supervise profiles, current Team Lead / Commando, and intervention history. Onboard new Sales Executives from Users."
            : isTeamLead
              ? "Your team's Sales Executives. Add someone new, then open their profile to manage or respond to Commando requests."
              : "Select a Sales Executive to coach, review, and act."
        }
        actions={
          canOnboardSe || canCreateSupport ? (
            <div className="flex flex-wrap gap-2">
              {canOnboardSe ? (
                <Link
                  href="/users/sales-executives/new"
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3.5 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
                >
                  Add Sales Executive
                </Link>
              ) : null}
              {canCreateSupport ? (
                <Link
                  href="/users/new"
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                >
                  Add Sales Support
                </Link>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <FilterBar>
        <div className="min-w-[12rem] flex-1">
          <TextInput
            label="Search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Name or email…"
          />
        </div>
        {user?.roleCode === "COMMANDO_EXECUTIVE" && (
          <label className="flex items-end gap-2 pb-2 text-sm text-[var(--color-ink-muted)]">
            <input
              type="checkbox"
              checked={includeHistory}
              onChange={(e) => {
                setPage(1);
                setIncludeHistory(e.target.checked);
              }}
            />
            Include completed
          </label>
        )}
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {canCreateProfile && (
        <form
          onSubmit={onCreate}
          className="grid max-w-xl gap-3 border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        >
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Create profile
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Only Sales Executive users without an existing profile can be linked.
          </p>
          <SearchableSelect
            label="Sales executive user"
            value={form.userId}
            onChange={(id) => {
              const selected = availableUsers.find((u) => u.id === id);
              setForm({
                ...form,
                userId: id,
                displayName: selected
                  ? `${selected.firstName} ${selected.lastName}`.trim()
                  : form.displayName,
              });
              setFieldErrors((prev) => ({ ...prev, userId: "" }));
            }}
            placeholder="Select user…"
            allowClear={false}
            options={availableUsers.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
              hint: u.email,
            }))}
          />
          {fieldErrors.userId && (
            <p className="text-xs text-[var(--status-danger)]">{fieldErrors.userId}</p>
          )}
          {availableUsers.length === 0 && (
            <div className="space-y-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                No Sales Executive accounts are available for a new profile.
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Create a Sales Executive account first, or use an existing account
                that does not already have a profile.
              </p>
              {canOnboardSe ? (
                <Link
                  href="/users/sales-executives/new"
                  className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
                >
                  Create Sales Executive
                </Link>
              ) : (
                <Link
                  href="/users"
                  className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
                >
                  Open Users
                </Link>
              )}
            </div>
          )}
          <SelectField
            label="Team"
            required
            value={form.teamId}
            onChange={(e) => {
              setForm({ ...form, teamId: e.target.value });
              setFieldErrors((prev) => ({ ...prev, teamId: "" }));
            }}
            error={fieldErrors.teamId}
          >
            <option value="">Select team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
          <TextInput
            label="Display name"
            required
            value={form.displayName}
            onChange={(e) => {
              setForm({ ...form, displayName: e.target.value });
              setFieldErrors((prev) => ({ ...prev, displayName: "" }));
            }}
            error={fieldErrors.displayName}
          />
          <TextInput
            label="Employee code"
            value={form.employeeCode}
            onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
          />
          <Button type="submit" disabled={submitting || availableUsers.length === 0}>
            {submitting ? "Creating…" : "Create profile"}
          </Button>
        </form>
      )}

      {!loading && profiles.length === 0 && !error && (
        <EmptyState
          title="No profiles in scope"
          description="Profiles appear here when Sales Executives are onboarded."
        />
      )}

      {!loading && profiles.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink)]">
              Profiles
              <span className="ml-1.5 font-medium text-[var(--color-ink-muted)]">
                · {total}
              </span>
            </h2>
          </div>

          {/* Desktop / laptop table */}
          <div className="hidden overflow-hidden rounded-[12px] border border-[var(--color-line)] bg-[var(--color-surface)] md:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  {(
                    [
                      "Sales Executive",
                      "Team",
                      "Team Lead",
                      "Commando",
                      "Intervention",
                      "Days",
                      "Actions",
                    ] as const
                  ).map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className={`px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink-subtle)] ${
                        label === "Actions" ? "text-right" : ""
                      } ${label === "Days" ? "w-[5.5rem]" : ""} ${
                        label === "Actions" ? "w-[9.5rem]" : ""
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const canComplete =
                    isCommando &&
                    canCompleteIntervention &&
                    p.currentAssignment?.status === "ACTIVE";
                  const days = p.currentAssignment?.totalDaysUnderCommando;
                  const lead = p.currentAssignment
                    ? `${p.currentAssignment.teamLead.firstName} ${p.currentAssignment.teamLead.lastName}`
                    : null;
                  const commando = p.currentAssignment
                    ? `${p.currentAssignment.commando.firstName} ${p.currentAssignment.commando.lastName}`
                    : null;
                  const active =
                    p.currentAssignment?.status === "ACTIVE";

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--color-line)] last:border-b-0 transition-colors duration-150 hover:bg-[var(--color-mint)]/40"
                    >
                      <td className="px-5 py-3.5 align-middle">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold leading-snug text-[var(--color-ink)]">
                            {p.displayName}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] leading-snug text-[var(--color-ink-muted)]">
                            {p.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <span className="text-[13px] font-medium text-[var(--color-ink)]">
                          {p.team.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <span className="text-[13px] text-[var(--color-ink)]">
                          {lead ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <span className="text-[13px] text-[var(--color-ink)]">
                          {commando ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        {p.currentAssignment ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${
                              active
                                ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                                : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                active
                                  ? "bg-[var(--status-success)]"
                                  : "bg-[var(--status-neutral)]"
                              }`}
                              aria-hidden
                            />
                            {active
                              ? "Active"
                              : p.currentAssignment.status.replaceAll("_", " ")}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[var(--color-ink-subtle)]">
                            None
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        {typeof days === "number" ? (
                          <span className="text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
                            {days} {days === 1 ? "day" : "days"}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[var(--color-ink-subtle)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/profiles/${p.id}`}
                            className="inline-flex h-8 items-center rounded-[8px] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                          >
                            Open
                          </Link>
                          {canComplete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={completeBusy}
                              className="h-8 gap-1 px-2 text-[12px] font-medium text-[var(--color-ink-muted)] hover:bg-[var(--status-success-bg)] hover:text-[var(--status-success)]"
                              title="Complete intervention"
                              aria-label={`Complete intervention for ${p.displayName}`}
                              onClick={() =>
                                setCompleteTarget({
                                  assignmentId: p.currentAssignment!.id,
                                  profileName: p.displayName,
                                })
                              }
                            >
                              <Check size={14} strokeWidth={2.25} aria-hidden />
                              Complete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablet / mobile cards */}
          <ul className="space-y-2 md:hidden">
            {profiles.map((p) => {
              const canComplete =
                isCommando &&
                canCompleteIntervention &&
                p.currentAssignment?.status === "ACTIVE";
              const days = p.currentAssignment?.totalDaysUnderCommando;
              const lead = p.currentAssignment
                ? `${p.currentAssignment.teamLead.firstName} ${p.currentAssignment.teamLead.lastName}`
                : null;
              const commando = p.currentAssignment
                ? `${p.currentAssignment.commando.firstName} ${p.currentAssignment.commando.lastName}`
                : null;
              const active = p.currentAssignment?.status === "ACTIVE";

              return (
                <li
                  key={p.id}
                  className="rounded-[12px] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 transition-colors duration-150"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[var(--color-ink)]">
                        {p.displayName}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)]">
                        {p.user.email}
                      </p>
                    </div>
                    {p.currentAssignment ? (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${
                          active
                            ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                            : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            active
                              ? "bg-[var(--status-success)]"
                              : "bg-[var(--status-neutral)]"
                          }`}
                          aria-hidden
                        />
                        {active
                          ? "Active"
                          : p.currentAssignment.status.replaceAll("_", " ")}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[12px] text-[var(--color-ink-subtle)]">
                        None
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink-subtle)]">
                        Team
                      </dt>
                      <dd className="mt-0.5 font-medium text-[var(--color-ink)]">
                        {p.team.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink-subtle)]">
                        Days
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-[var(--color-ink)]">
                        {typeof days === "number"
                          ? `${days} ${days === 1 ? "day" : "days"}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink-subtle)]">
                        Team Lead
                      </dt>
                      <dd className="mt-0.5 text-[var(--color-ink)]">
                        {lead ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink-subtle)]">
                        Commando
                      </dt>
                      <dd className="mt-0.5 text-[var(--color-ink)]">
                        {commando ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--color-line)] pt-3">
                    <Link
                      href={`/profiles/${p.id}`}
                      className="inline-flex h-8 flex-1 items-center justify-center rounded-[8px] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors duration-150 hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      Open
                    </Link>
                    {canComplete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={completeBusy}
                        className="h-8 gap-1 px-2.5 text-[12px] font-medium text-[var(--color-ink-muted)] hover:bg-[var(--status-success-bg)] hover:text-[var(--status-success)]"
                        title="Complete intervention"
                        aria-label={`Complete intervention for ${p.displayName}`}
                        onClick={() =>
                          setCompleteTarget({
                            assignmentId: p.currentAssignment!.id,
                            profileName: p.displayName,
                          })
                        }
                      >
                        <Check size={14} strokeWidth={2.25} aria-hidden />
                        Complete
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="px-0.5">
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              disabled={loading}
              noun="profiles"
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPage(1);
                setPageSize(n);
              }}
            />
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(completeTarget)}
        title="Complete this intervention?"
        message={
          completeTarget
            ? `Ends the active Commando assignment for ${completeTarget.profileName}. The Team Lead remains the permanent owner.`
            : ""
        }
        confirmLabel="Complete intervention"
        busy={completeBusy}
        onConfirm={() => void completeIntervention()}
        onCancel={() => {
          if (!completeBusy) setCompleteTarget(null);
        }}
      />
    </div>
  );
}

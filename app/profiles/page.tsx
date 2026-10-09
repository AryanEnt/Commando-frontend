"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye } from "lucide-react";
import { ViewOnlyPill } from "@/components/CommandoViewOnlyBanner";
import { api, errorMessage, type ProfileListItem, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import { ChangeDesignationButton } from "@/components/ChangeDesignationButton";
import { HandoffReportDialog } from "@/components/assignments/HandoffReportDialog";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SelectField,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

/** Active interventions are an attention state, so they carry the rose accent rather than "good" green. */
function InterventionPill({ status }: { status?: string }) {
  if (!status) {
    return <span className="text-[12px] text-[var(--color-ink-muted)]">None</span>;
  }
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        active
          ? "bg-[var(--color-accent-rose-soft)] text-[var(--color-accent-rose-ink)]"
          : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          active ? "bg-[var(--color-accent-rose)]" : "bg-[var(--status-neutral)]"
        }`}
        aria-hidden
      />
      {active ? "Active" : status.replaceAll("_", " ")}
    </span>
  );
}

export default function ProfilesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading Sales Executives…" />}>
      <ProfilesPageInner />
    </Suspense>
  );
}

function ProfilesPageInner() {
  const { token, user, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
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
  }, [token, search, page, pageSize]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
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
  }, [search, page, router, searchParams]);

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
      toast.success("Profile created");
      setForm({ userId: "", teamId: "", displayName: "", employeeCode: "" });
      setFieldErrors({});
      await load(search);
    } catch (err) {
      toast.error(errorMessage(err, "Unable to create profile"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onInterventionCompleted() {
    if (!completeTarget) return;
    toast.success(`Intervention completed for ${completeTarget.profileName}`, {
      description: "Your handoff report is with the Team Lead.",
    });
    setCompleteTarget(null);
    await load(search);
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
                <ButtonLink href="/users/sales-executives/new">Add Sales Executive</ButtonLink>
              ) : null}
              {canCreateSupport ? (
                <ButtonLink href="/users/new" variant="outline">
                  Add Sales Support
                </ButtonLink>
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
      </FilterBar>

      {isCommando && profiles.some((p) => p.commandoAccess?.mode === "READ_ONLY") ? (
        <p className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-muted)]">
          <Eye size={14} className="shrink-0 text-[var(--status-info)]" aria-hidden />
          Sales Executives you handed off stay visible as{" "}
          <strong className="font-semibold text-[var(--color-ink)]">view-only</strong>{" "}
          for 1 month after the handoff date.
        </p>
      ) : null}

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
          <div className="surface-card hidden overflow-hidden md:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b bg-[var(--color-canvas)]">
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
                      className={`px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted)] ${
                        label === "Actions" ? "text-right" : ""
                      } ${label === "Days" ? "w-[7.5rem]" : ""} ${
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
                  const viewOnly =
                    p.commandoAccess?.mode === "READ_ONLY" ? p.commandoAccess : null;
                  const lead = p.currentAssignment
                    ? `${p.currentAssignment.teamLead.firstName} ${p.currentAssignment.teamLead.lastName}`
                    : viewOnly?.teamLead
                      ? `${viewOnly.teamLead.firstName} ${viewOnly.teamLead.lastName}`
                      : null;
                  const commando = p.currentAssignment
                    ? `${p.currentAssignment.commando.firstName} ${p.currentAssignment.commando.lastName}`
                    : null;

                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-b-0 transition-colors duration-150 hover:bg-[var(--color-brand-soft)]/60"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold leading-snug text-[var(--color-ink)]">
                            {p.displayName}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] leading-snug text-[var(--color-ink-muted)]">
                            {p.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="text-[13px] font-medium text-[var(--color-ink)]">
                          {p.team.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="text-[13px] text-[var(--color-ink)]">
                          {lead ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="text-[13px] text-[var(--color-ink)]">
                          {commando ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        {viewOnly ? (
                          <ViewOnlyPill access={viewOnly} />
                        ) : (
                          <InterventionPill status={p.currentAssignment?.status} />
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        {typeof days === "number" ? (
                          <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
                            {days} {days === 1 ? "day" : "days"}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[var(--color-ink-subtle)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <ButtonLink
                            href={`/profiles/${p.id}`}
                            size="sm"
                            variant={viewOnly ? "outline" : undefined}
                          >
                            {viewOnly ? "View" : "Open"}
                          </ButtonLink>
                          <ChangeDesignationButton
                            userId={p.user.id}
                            name={p.displayName}
                            currentRole="SALES_EXECUTIVE"
                            onChanged={() => load(search)}
                          />
                          {canComplete ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
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
              const viewOnly =
                p.commandoAccess?.mode === "READ_ONLY" ? p.commandoAccess : null;
              const lead = p.currentAssignment
                ? `${p.currentAssignment.teamLead.firstName} ${p.currentAssignment.teamLead.lastName}`
                : viewOnly?.teamLead
                  ? `${viewOnly.teamLead.firstName} ${viewOnly.teamLead.lastName}`
                  : null;
              const commando = p.currentAssignment
                ? `${p.currentAssignment.commando.firstName} ${p.currentAssignment.commando.lastName}`
                : null;

              return (
                <li
                  key={p.id}
                  className="surface-card px-4 py-4"
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
                    <span className="shrink-0">
                      {viewOnly ? (
                        <ViewOnlyPill access={viewOnly} />
                      ) : (
                        <InterventionPill status={p.currentAssignment?.status} />
                      )}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
                        Team
                      </dt>
                      <dd className="mt-0.5 font-medium text-[var(--color-ink)]">
                        {p.team.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
                        Days
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-[var(--color-ink)]">
                        {typeof days === "number"
                          ? `${days} ${days === 1 ? "day" : "days"}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
                        Team Lead
                      </dt>
                      <dd className="mt-0.5 text-[var(--color-ink)]">
                        {lead ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
                        Commando
                      </dt>
                      <dd className="mt-0.5 text-[var(--color-ink)]">
                        {commando ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex items-center gap-1.5 border-t pt-3">
                    <ButtonLink
                      href={`/profiles/${p.id}`}
                      size="sm"
                      className="flex-1"
                      variant={viewOnly ? "outline" : undefined}
                    >
                      {viewOnly ? "View" : "Open"}
                    </ButtonLink>
                    <ChangeDesignationButton
                      userId={p.user.id}
                      name={p.displayName}
                      currentRole="SALES_EXECUTIVE"
                      onChanged={() => load(search)}
                    />
                    {canComplete ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
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

      <HandoffReportDialog
        open={Boolean(completeTarget)}
        assignmentId={completeTarget?.assignmentId ?? null}
        profileName={completeTarget?.profileName ?? ""}
        endInput={{
          status: "COMPLETED",
          completionReason: "Intervention completed from Sales Executives list",
        }}
        onCancel={() => setCompleteTarget(null)}
        onCompleted={onInterventionCompleted}
      />
    </div>
  );
}

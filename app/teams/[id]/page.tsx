"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  UserMinus,
  UsersRound,
} from "lucide-react";
import { api, type Team, type TeamMember } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDate } from "@/lib/dates";
import { personName, roleLabel } from "@/lib/labels";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Avatar,
  Button,
  ButtonLink,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SelectField,
  Skeleton,
  StatusPill,
  TextInput,
} from "@/components/ui";

const TEAM_ROLE_OPTIONS = [
  { value: "TEAM_LEAD", label: "Team Lead" },
  { value: "SALES_EXECUTIVE", label: "Sales Executive" },
  { value: "SALES_SUPPORT_EXECUTIVE", label: "Sales Support" },
  { value: "MEMBER", label: "Member" },
] as const;

function teamRoleLabel(code: string) {
  return TEAM_ROLE_OPTIONS.find((o) => o.value === code)?.label ?? roleLabel(code);
}

function roleTone(
  code: string,
): "success" | "warn" | "danger" | "info" | "neutral" {
  switch (code) {
    case "TEAM_LEAD":
      return "info";
    case "SALES_EXECUTIVE":
      return "success";
    case "SALES_SUPPORT_EXECUTIVE":
      return "warn";
    default:
      return "neutral";
  }
}

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<
    {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      role: { code: string };
    }[]
  >([]);
  const [userId, setUserId] = useState("");
  const [roleInTeam, setRoleInTeam] = useState("MEMBER");
  const [memberQuery, setMemberQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [endTarget, setEndTarget] = useState<TeamMember | null>(null);
  const [endBusy, setEndBusy] = useState(false);

  const canManage = hasPermission("TEAM_MANAGE");

  async function reloadMembers() {
    if (!token || !params.id) return;
    const membersRes = await api.getTeamMembers(token, params.id);
    setMembers(membersRes.data.members);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const [teamRes, membersRes] = await Promise.all([
          api.getTeam(token, params.id),
          api.getTeamMembers(token, params.id),
        ]);
        if (cancelled) return;
        setTeam(teamRes.data.team);
        setMembers(membersRes.data.members);
        setError(null);
        if (hasPermission("USER_VIEW")) {
          const usersRes = await api.getUsers(token, {
            isActive: true,
            pageSize: 100,
            sort: "createdAt",
            order: "desc",
          });
          if (!cancelled) setUsers(usersRes.data.users);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load team");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id, hasPermission]);

  const activeMembers = useMemo(
    () => members.filter((m) => m.isActive),
    [members],
  );
  const historicalMembers = useMemo(
    () => members.filter((m) => !m.isActive),
    [members],
  );

  const activeUserIds = useMemo(
    () => new Set(activeMembers.map((m) => m.user.id)),
    [activeMembers],
  );

  const eligibleUsers = useMemo(
    () => users.filter((u) => u.isActive && !activeUserIds.has(u.id)),
    [users, activeUserIds],
  );

  const filteredActive = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return activeMembers;
    return activeMembers.filter((m) => {
      const name = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        teamRoleLabel(m.roleInTeam).toLowerCase().includes(q)
      );
    });
  }, [activeMembers, memberQuery]);

  const leads = activeMembers.filter((m) => m.roleInTeam === "TEAM_LEAD");
  const executives = activeMembers.filter(
    (m) => m.roleInTeam === "SALES_EXECUTIVE",
  );
  const support = activeMembers.filter(
    (m) => m.roleInTeam === "SALES_SUPPORT_EXECUTIVE",
  );
  const others = activeMembers.filter(
    (m) =>
      m.roleInTeam !== "TEAM_LEAD" &&
      m.roleInTeam !== "SALES_EXECUTIVE" &&
      m.roleInTeam !== "SALES_SUPPORT_EXECUTIVE",
  );

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !params.id || !userId) return;
    setAddBusy(true);
    setAddError(null);
    try {
      await api.addTeamMember(token, params.id, { userId, roleInTeam });
      setUserId("");
      setRoleInTeam("MEMBER");
      setDrawerOpen(false);
      await reloadMembers();
      pushToast("Member added to team", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add member";
      setAddError(message);
      pushToast(message, "error");
    } finally {
      setAddBusy(false);
    }
  }

  async function confirmEndMembership() {
    if (!token || !params.id || !endTarget) return;
    setEndBusy(true);
    try {
      await api.endTeamMember(token, params.id, endTarget.id);
      setEndTarget(null);
      await reloadMembers();
      pushToast("Membership ended", "success");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Failed to end membership",
        "error",
      );
    } finally {
      setEndBusy(false);
    }
  }

  if (error) {
    return (
      <div className="page-shell">
        <ButtonLink href="/teams" variant="secondary" size="sm">
          <ArrowLeft size={14} aria-hidden />
          Teams
        </ButtonLink>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!team) {
    return <LoadingState label="Loading team…" />;
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="People"
        title={team.name}
        description={
          team.description ||
          "Membership, roles, and reporting structure for this team."
        }
        breadcrumbs={
          <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-ink-muted)]">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/teams" className="hover:text-[var(--color-ink)]">
                  Teams
                </Link>
              </li>
              <li className="flex items-center gap-1">
                <span aria-hidden>/</span>
                <span className="font-medium text-[var(--color-ink)]">
                  {team.name}
                </span>
              </li>
            </ol>
          </nav>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href="/teams" variant="secondary" size="sm">
              <ArrowLeft size={14} aria-hidden />
              All teams
            </ButtonLink>
            {canManage ? (
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus size={14} aria-hidden />
                Add member
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Summary card — same language as team directory cards */}
      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
              <UsersRound size={18} aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
                {team.name}
              </h2>
              {team.description ? (
                <p className="mt-1 max-w-xl text-sm text-[var(--color-ink-muted)]">
                  {team.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill tone="success">Active</StatusPill>
            <span className="text-[11px] text-[var(--color-ink-subtle)]">
              {activeMembers.length} members
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-line)] pt-4 sm:grid-cols-4">
          <Stat label="Team Lead" value={leads.length} />
          <Stat label="Executives" value={executives.length} />
          <Stat label="Support" value={support.length} />
          <Stat label="Other" value={others.length} />
        </div>

        {leads.length > 0 || executives.length > 0 ? (
          <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
              Structure
            </p>
            <ol className="mt-2 space-y-1.5">
              {leads.slice(0, 2).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 text-xs text-[var(--color-ink)]"
                >
                  <Avatar name={personName(m.user)} size="sm" />
                  <span className="truncate font-medium">
                    {personName(m.user)}
                  </span>
                  <span className="text-[var(--color-ink-subtle)]">Lead</span>
                </li>
              ))}
              {leads.length > 2 ? (
                <li className="pl-8 text-xs text-[var(--color-ink-subtle)]">
                  +{leads.length - 2} more leads
                </li>
              ) : null}
              {executives[0] ? (
                <li className="flex items-center gap-2 pl-3 text-xs text-[var(--color-ink-muted)]">
                  <span className="text-[var(--color-ink-subtle)]" aria-hidden>
                    ↓
                  </span>
                  <span className="truncate">
                    {personName(executives[0].user)}
                    {executives.length > 1
                      ? ` +${executives.length - 1}`
                      : ""}
                  </span>
                </li>
              ) : null}
            </ol>
          </div>
        ) : null}
      </section>

      {/* Member directory */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            Member directory
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {filteredActive.length === activeMembers.length
              ? `${activeMembers.length} active member${activeMembers.length === 1 ? "" : "s"}`
              : `${filteredActive.length} of ${activeMembers.length} members`}
          </p>
        </div>
        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-subtle)]"
            aria-hidden
          />
          <input
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder="Search members…"
            aria-label="Search members"
            className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] pl-8 pr-3 text-sm"
          />
        </div>
      </div>

      {filteredActive.length === 0 ? (
        <EmptyState
          title={
            memberQuery ? "No members match your search" : "No active members"
          }
          description={
            memberQuery
              ? "Try a different name, email, or role."
              : "Add a Team Lead or Sales Executive to start this team."
          }
          action={
            canManage && !memberQuery ? (
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus size={14} aria-hidden />
                Add member
              </Button>
            ) : undefined
          }
          icon="emptyUsers"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredActive.map((m) => {
            const name = personName(m.user);
            return (
              <div
                key={m.id}
                className="flex flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {name}
                    </p>
                    <p className="truncate text-xs text-[var(--color-ink-muted)]">
                      {m.user.email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-line)] pt-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                      System role
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[var(--color-ink)]">
                      {roleLabel(m.user.role?.code ?? "")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                      In team
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[var(--color-ink)]">
                      {teamRoleLabel(m.roleInTeam)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusPill tone={roleTone(m.roleInTeam)}>
                    {teamRoleLabel(m.roleInTeam)}
                  </StatusPill>
                  <span className="text-[11px] text-[var(--color-ink-subtle)]">
                    Since {formatDate(m.startedAt)}
                  </span>
                </div>

                {canManage ? (
                  <div className="mt-3 border-t border-[var(--color-line)] pt-3">
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full"
                      onClick={() => setEndTarget(m)}
                    >
                      <UserMinus size={14} aria-hidden />
                      End membership
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {historicalMembers.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
              Membership history
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              {historicalMembers.length} ended membership
              {historicalMembers.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="table-frame overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role in team</th>
                    <th>Started</th>
                    <th>Ended</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={personName(m.user)} size="sm" />
                          <div className="min-w-0">
                            <div className="font-medium text-[var(--color-ink)]">
                              {personName(m.user)}
                            </div>
                            <div className="text-xs text-[var(--color-ink-muted)]">
                              {m.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">
                        {teamRoleLabel(m.roleInTeam)}
                      </td>
                      <td className="tabular-nums text-sm">
                        {formatDate(m.startedAt)}
                      </td>
                      <td className="tabular-nums text-sm">
                        {formatDate(m.endedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <Drawer
        open={drawerOpen}
        onClose={() => !addBusy && setDrawerOpen(false)}
        title="Add member"
        description="Add an existing active user who is not already on this team."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={addBusy}
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-team-member-form"
              size="sm"
              disabled={addBusy || !userId}
            >
              {addBusy ? "Adding…" : "Add member"}
            </Button>
          </div>
        }
      >
        <form
          id="add-team-member-form"
          className="space-y-4"
          onSubmit={(e) => void onAdd(e)}
        >
          <div className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] p-3">
            <UsersRound
              size={16}
              className="mt-0.5 text-[var(--color-brand)]"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              Team roles define how this person appears in structure, handoffs,
              and reporting for {team.name}.
            </p>
          </div>
          <SearchableSelect
            label="User"
            value={userId}
            onChange={setUserId}
            allowClear
            placeholder="Select user…"
            options={eligibleUsers.map((u) => ({
              value: u.id,
              label: personName(u),
              hint: `${roleLabel(u.role.code)} · ${u.email}`,
            }))}
          />
          <SelectField
            label="Role in team"
            value={roleInTeam}
            onChange={(e) => setRoleInTeam(e.target.value)}
          >
            {TEAM_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
          {addError ? (
            <p className="text-sm text-[var(--status-danger)]" role="alert">
              {addError}
            </p>
          ) : null}
          {eligibleUsers.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No eligible users left to add. Create a user first, or end an
              existing membership.
            </p>
          ) : null}
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(endTarget)}
        title="End membership?"
        message={
          endTarget
            ? `${personName(endTarget.user)} will be removed from ${team.name}. Historical membership remains available.`
            : ""
        }
        confirmLabel="End membership"
        danger
        busy={endBusy}
        onConfirm={() => void confirmEndMembership()}
        onCancel={() => setEndTarget(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Network, Plus, Search, UsersRound } from "lucide-react";
import { api, type OrganizationStructure, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { personName } from "@/lib/labels";
import {
  Avatar,
  Button,
  ButtonLink,
  Drawer,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
  TextArea,
  TextInput,
  Skeleton,
} from "@/components/ui";

type OrgTeam = OrganizationStructure["teams"][number];

function TeamCard({
  team,
  org,
}: {
  team: Team;
  org?: OrgTeam;
}) {
  const lead = org?.teamLeads[0]?.user;
  const commandos = org?.salesExecutives
    .map((se) => se.currentAssignment?.commando)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const uniqueCommandos = Array.from(
    new Map(
      (commandos ?? []).map((c) => [`${c.firstName}-${c.lastName}`, c]),
    ).values(),
  );
  const seCount = org?.salesExecutives.length ?? team.profileCount ?? 0;
  const leadName = lead ? personName(lead) : null;
  const firstCommando = uniqueCommandos[0];
  const firstSe = org?.salesExecutives[0];

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition duration-200 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
              <UsersRound size={15} />
            </span>
            <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {team.name}
            </h3>
          </div>
          {team.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {team.description}
            </p>
          ) : null}
        </div>
        <ArrowRight
          size={14}
          className="mt-1 shrink-0 text-[var(--color-ink-subtle)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--color-line)] pt-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
            Team Lead
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
            {org ? org.teamLeads.length : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
            Commandos
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
            {org ? uniqueCommandos.length : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
            Executives
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
            {seCount}
          </p>
        </div>
      </div>

      {(leadName || firstSe) && (
        <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
            Structure
          </p>
          <ol className="mt-2 space-y-1.5">
            {leadName ? (
              <li className="flex items-center gap-2 text-xs text-[var(--color-ink)]">
                <Avatar name={leadName} size="sm" />
                <span className="truncate font-medium">{leadName}</span>
                <span className="text-[var(--color-ink-subtle)]">Lead</span>
              </li>
            ) : null}
            {firstCommando ? (
              <li className="flex items-center gap-2 pl-3 text-xs text-[var(--color-ink-muted)]">
                <span className="text-[var(--color-ink-subtle)]" aria-hidden>
                  ↓
                </span>
                <span className="truncate">
                  {personName(firstCommando)}
                  {uniqueCommandos.length > 1
                    ? ` +${uniqueCommandos.length - 1}`
                    : ""}
                </span>
              </li>
            ) : null}
            {firstSe ? (
              <li className="flex items-center gap-2 pl-6 text-xs text-[var(--color-ink-muted)]">
                <span className="text-[var(--color-ink-subtle)]" aria-hidden>
                  ↓
                </span>
                <span className="truncate">
                  {firstSe.displayName}
                  {seCount > 1 ? ` +${seCount - 1}` : ""}
                </span>
              </li>
            ) : null}
          </ol>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <StatusPill tone="success">Active</StatusPill>
        <span className="text-[11px] text-[var(--color-ink-subtle)]">
          {team.memberCount ?? 0} members
        </span>
      </div>
    </Link>
  );
}

function TeamsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        >
          <Skeleton className="h-8 w-8 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-3 h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeamsPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [orgTeams, setOrgTeams] = useState<OrgTeam[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const canManage = hasPermission("TEAM_MANAGE");
  const canViewOrg = hasPermission("TEAM_VIEW");

  const orgById = useMemo(
    () => new Map(orgTeams.map((t) => [t.id, t])),
    [orgTeams],
  );

  async function load(q?: string) {
    if (!token) return;
    setLoading(true);
    try {
      const [teamsRes, orgRes] = await Promise.all([
        api.getTeams(token, q),
        canViewOrg
          ? api.getOrganizationStructure(token).catch(() => null)
          : Promise.resolve(null),
      ]);
      setTeams(teamsRes.data.teams);
      setOrgTeams(orgRes?.data.teams ?? []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't retrieve the team directory.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => void load(search), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    try {
      await api.createTeam(token, {
        name,
        description: description || undefined,
      });
      pushToast("Team created", "success");
      setName("");
      setDescription("");
      setDrawerOpen(false);
      await load(search);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create team";
      pushToast(msg, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="People"
        title="Teams"
        description="Manage team structure, membership, and reporting relationships."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canViewOrg ? (
              <ButtonLink href="/organization" variant="secondary" size="sm">
                <Network size={14} aria-hidden />
                Organization view
              </ButtonLink>
            ) : null}
            {canManage ? (
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus size={14} aria-hidden />
                Create team
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            Team directory
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {loading
              ? "Loading teams…"
              : `${teams.length} team${teams.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-subtle)]"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams…"
            aria-label="Search teams"
            className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] pl-8 pr-3 text-sm"
          />
        </div>
      </div>

      {error && (
        <ErrorState message={error} onRetry={() => void load(search)} />
      )}
      {loading && <TeamsSkeleton />}

      {!loading && teams.length === 0 && !error && (
        <EmptyState
          title="No teams yet"
          description="Create your first team to start building the Team Lead → Commando → Sales Executive structure."
          action={
            canManage ? (
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus size={14} aria-hidden />
                Create team
              </Button>
            ) : undefined
          }
          icon="emptyUsers"
        />
      )}

      {!loading && teams.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} org={orgById.get(team.id)} />
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => !creating && setDrawerOpen(false)}
        title="Create team"
        description="Add a team to organize Team Leads, Commandos, and Sales Executives."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={creating}
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-team-form"
              size="sm"
              disabled={creating || !name.trim()}
            >
              {creating ? "Creating…" : "Create team"}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={onCreate} id="create-team-form">
          <div className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] p-3">
            <Building2
              size={16}
              className="mt-0.5 text-[var(--color-brand)]"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              Teams define reporting relationships used across interventions,
              reviews, and organization views.
            </p>
          </div>
          <TextInput
            label="Team name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alpha Sales Team"
          />
          <TextArea
            label="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional context for this team"
          />
        </form>
      </Drawer>
    </div>
  );
}

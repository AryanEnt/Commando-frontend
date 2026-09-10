"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Panel,
  TableSkeleton,
  TextArea,
  TextInput,
} from "@/components/ui";

export default function TeamsPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const canManage = hasPermission("TEAM_MANAGE");

  async function load(q?: string) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getTeams(token, q);
      setTeams(res.data.teams);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
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
    try {
      await api.createTeam(token, { name, description: description || undefined });
      pushToast("Team created", "success");
      setName("");
      setDescription("");
      await load(search);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create team";
      pushToast(msg, "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Create teams, manage membership, and view Team Lead → Commando → Sales Executive structure."
        actions={
          hasPermission("TEAM_VIEW") ? (
            <Link
              href="/organization"
              className="text-sm font-medium text-[var(--color-brand)] hover:underline"
            >
              Organization view
            </Link>
          ) : undefined
        }
      />

      <FilterBar>
        <div className="min-w-[12rem] flex-1">
          <TextInput
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Team name…"
          />
        </div>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {canManage && (
        <form
          onSubmit={onCreate}
          className="grid max-w-xl gap-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-slate-900">Create team</h2>
          <TextInput
            label="Team name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextArea
            label="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit">Create</Button>
        </form>
      )}

      {!loading && teams.length === 0 && !error && (
        <EmptyState
          title="No teams in scope"
          description="Teams appear here once created."
        />
      )}

      {!loading && teams.length > 0 && (
        <Panel title={`Teams · ${teams.length}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Members</th>
                  <th className="px-3 py-2">Profiles</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{team.name}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {team.memberCount ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {team.profileCount ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/teams/${team.id}`}
                        className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

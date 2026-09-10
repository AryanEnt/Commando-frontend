"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, type Team, type TeamMember } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  LoadingState,
  Panel,
  SelectField,
} from "@/components/ui";

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, hasPermission } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<
    { id: string; email: string; firstName: string; lastName: string; role: { code: string } }[]
  >([]);
  const [userId, setUserId] = useState("");
  const [roleInTeam, setRoleInTeam] = useState("MEMBER");
  const [error, setError] = useState<string | null>(null);

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
          const usersRes = await api.getUsers(token);
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

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !params.id) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/teams/${params.id}/members`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, roleInTeam }),
      },
    );
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body?.error?.message ?? "Failed to add member");
    }
    setUserId("");
    const membersRes = await api.getTeamMembers(token, params.id);
    setMembers(membersRes.data.members);
  }

  async function endMembership(membershipId: string) {
    if (!token || !params.id) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/teams/${params.id}/members/${membershipId}/end`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      },
    );
    const membersRes = await api.getTeamMembers(token, params.id);
    setMembers(membersRes.data.members);
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Link href="/teams" className="text-sm text-slate-600 underline">
          ← Teams
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!team) {
    return <LoadingState label="Loading team…" />;
  }

  const activeMembers = members.filter((m) => m.isActive);
  const historicalMembers = members.filter((m) => !m.isActive);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/teams" className="text-sm text-slate-600 underline">
          ← Teams
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {team.name}
        </h1>
        {team.description && (
          <p className="text-sm text-slate-600">{team.description}</p>
        )}
      </div>

      {hasPermission("TEAM_MANAGE") && (
        <form
          onSubmit={onAdd}
          className="grid max-w-xl gap-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-slate-900">Add member</h2>
          <SearchableSelect
            label="User"
            value={userId}
            onChange={setUserId}
            allowClear={false}
            placeholder="Select user…"
            options={users.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
              hint: `${u.role.code} · ${u.email}`,
            }))}
          />
          <SelectField
            label="Role in team"
            value={roleInTeam}
            onChange={(e) => setRoleInTeam(e.target.value)}
          >
            <option value="TEAM_LEAD">TEAM_LEAD</option>
            <option value="SALES_EXECUTIVE">SALES_EXECUTIVE</option>
            <option value="SALES_SUPPORT_EXECUTIVE">
              SALES_SUPPORT_EXECUTIVE
            </option>
            <option value="MEMBER">MEMBER</option>
          </SelectField>
          <Button type="submit" className="justify-self-start">
            Add member
          </Button>
        </form>
      )}

      <Panel title={`Active members · ${activeMembers.length}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Role in team</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {activeMembers.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {m.user.firstName} {m.user.lastName}
                    <div className="text-xs text-slate-500">{m.user.email}</div>
                  </td>
                  <td className="px-3 py-2">{m.roleInTeam}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatDate(m.startedAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {hasPermission("TEAM_MANAGE") && (
                      <button
                        type="button"
                        className="text-xs text-slate-700 underline underline-offset-2 hover:text-slate-900"
                        onClick={() => endMembership(m.id)}
                      >
                        End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {activeMembers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No active members
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {historicalMembers.length > 0 && (
        <Panel title={`Membership history · ${historicalMembers.length}`} tone="history">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Role in team</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Ended</th>
                </tr>
              </thead>
              <tbody>
                {historicalMembers.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {m.user.firstName} {m.user.lastName}
                      <div className="text-xs text-slate-500">{m.user.email}</div>
                    </td>
                    <td className="px-3 py-2">{m.roleInTeam}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatDate(m.startedAt)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatDate(m.endedAt)}
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

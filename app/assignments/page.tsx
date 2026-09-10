"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Assignment, type ProfileListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/lib/toast-context";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  Panel,
  SegmentedControl,
  TableSkeleton,
} from "@/components/ui";

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading assignments…" />}>
      <AssignmentsContent />
    </Suspense>
  );
}

function AssignmentsContent() {
  const { token, user, hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentOnly, setCurrentOnly] = useState(
    searchParams.get("currentOnly") === "true",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<
    { id: string; email: string; firstName: string; lastName: string; role: { code: string } }[]
  >([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileListItem | null>(null);
  const [form, setForm] = useState({
    salesExecutiveProfileId: "",
    commandoUserId: "",
    teamLeadUserId: "",
    teamId: "",
  });

  useEffect(() => {
    setCurrentOnly(searchParams.get("currentOnly") === "true");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getAssignments(token, { currentOnly });
        if (!cancelled) {
          setAssignments(res.data.assignments);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, currentOnly]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !hasPermission("ASSIGNMENT_CREATE")) return;
      const res = await api.getUsers(token);
      if (!cancelled) setUsers(res.data.users);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, hasPermission]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await api.createAssignment(token, form);
      pushToast("Assignment created", "success");
      setForm({
        salesExecutiveProfileId: "",
        commandoUserId: "",
        teamLeadUserId: "",
        teamId: "",
      });
      const res = await api.getAssignments(token, { currentOnly });
      setAssignments(res.data.assignments);
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Failed to create assignment",
        "error",
      );
    }
  }

  const commandos = users.filter((u) => u.role.code === "COMMANDO_EXECUTIVE");
  const teamLeads = users.filter((u) => u.role.code === "TEAM_LEAD");
  /** Super Admin supervises via Reports — does not create operational assignments. */
  const canCreate =
    hasPermission("ASSIGNMENT_CREATE") && user?.roleCode !== "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commando Assignments"
        description="Current and historical coaching assignments."
      />

      <FilterBar>
        <SegmentedControl
          ariaLabel="Assignment scope"
          value={currentOnly ? "active" : "all"}
          onChange={(v) => setCurrentOnly(v === "active")}
          options={[
            { value: "active", label: "Current only" },
            { value: "all", label: "All history" },
          ]}
        />
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {canCreate && (
        <form
          onSubmit={onCreate}
          className="grid max-w-xl gap-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-slate-900">Create assignment</h2>
          <ProfileSearchSelect
            value={form.salesExecutiveProfileId}
            onChange={(id, profile?: ProfileListItem) => {
              setSelectedProfile(profile ?? null);
              setForm({
                ...form,
                salesExecutiveProfileId: id,
                teamId: profile?.teamId ?? form.teamId,
              });
            }}
          />
          {selectedProfile?.currentAssignment && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-medium">Already assigned</p>
              <p className="mt-1 text-slate-700">
                {selectedProfile.displayName} is currently assigned to{" "}
                {selectedProfile.currentAssignment.commando.firstName}{" "}
                {selectedProfile.currentAssignment.commando.lastName}.
              </p>
              <p className="mt-1 text-xs text-slate-600">
                End or transfer that assignment before creating another active assignment.
              </p>
            </div>
          )}
          <SearchableSelect
            label="Commando"
            value={form.commandoUserId}
            onChange={(id) => setForm({ ...form, commandoUserId: id })}
            placeholder="Select Commando…"
            allowClear={false}
            options={commandos.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
              hint: u.email,
            }))}
          />
          <SearchableSelect
            label="Team Lead"
            value={form.teamLeadUserId}
            onChange={(id) => setForm({ ...form, teamLeadUserId: id })}
            placeholder="Select Team Lead…"
            allowClear={false}
            options={teamLeads.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
              hint: u.email,
            }))}
          />
          <Button type="submit" disabled={Boolean(selectedProfile?.currentAssignment)}>
            Assign Commando
          </Button>
        </form>
      )}

      {!loading && !error && assignments.length === 0 && (
        <EmptyState
          title="No assignments in scope"
          description={
            currentOnly
              ? "No active assignments. Switch to All history or create one."
              : "No assignment records found."
          }
        />
      )}

      {!loading && assignments.length > 0 && (
        <Panel
          title={
            currentOnly
              ? `Active assignments · ${assignments.length}`
              : `All assignments · ${assignments.length}`
          }
          tone={currentOnly ? "active" : "history"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Commando</th>
                  <th className="px-3 py-2">Team Lead</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Days</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {a.profile?.displayName ?? a.salesExecutiveProfileId}
                    </td>
                    <td className="px-3 py-2">
                      {a.commando.firstName} {a.commando.lastName}
                    </td>
                    <td className="px-3 py-2">
                      {a.teamLead.firstName} {a.teamLead.lastName}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {a.totalDaysUnderCommando}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/assignments/${a.id}`}
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

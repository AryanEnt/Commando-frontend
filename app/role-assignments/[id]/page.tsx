"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type RoleAssignment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  DateTimeCell,
  ErrorState,
  LoadingState,
  TextArea,
} from "@/components/ui";

export default function RoleAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, hasPermission } = useAuth();
  const [item, setItem] = useState<RoleAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [primaryResponsibility, setPrimaryResponsibility] = useState("");
  const [shouldDo, setShouldDo] = useState<string[]>([]);
  const [shouldNotDo, setShouldNotDo] = useState<string[]>([]);

  const canEdit = hasPermission("ROLE_ASSIGNMENT_EDIT");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getRoleAssignment(token, params.id);
        if (!cancelled) {
          setItem(res.data.roleAssignment);
          setPrimaryResponsibility(
            res.data.roleAssignment.primaryResponsibility,
          );
          setShouldDo(res.data.roleAssignment.shouldDo.map((i) => i.text));
          setShouldNotDo(
            res.data.roleAssignment.shouldNotDo.map((i) => i.text),
          );
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.updateRoleAssignment(token, item.id, {
        primaryResponsibility,
        shouldDo: shouldDo.map((s) => s.trim()).filter(Boolean),
        shouldNotDo: shouldNotDo.map((s) => s.trim()).filter(Boolean),
      });
      router.replace(`/role-assignments/${res.data.roleAssignment.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  if (error && !item) {
    return (
      <div className="space-y-2">
        <Link
          href="/role-assignments"
          className="text-sm text-slate-600 underline"
        >
          ← Role Assignments
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!item) return <LoadingState label="Loading role assignment…" />;

  function personName(p: { firstName: string; lastName: string } | null) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  const isHistorical = item.status !== "ACTIVE";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/role-assignments"
            className="text-sm text-slate-600 underline"
          >
            ← Role Assignments
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {item.profile.displayName}
          </h1>
          <p className="text-sm text-slate-600">
            Support role instructions for {personName(item.salesSupportUser)}
          </p>
          <div className="mt-2">
            <StatusBadge status={item.status} />
          </div>
        </div>
        {canEdit && item.status === "ACTIVE" && !editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit (creates new version)
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} />}

      <dl className="grid gap-4 rounded border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Team</dt>
          <dd>{item.team.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Commando</dt>
          <dd>{personName(item.commando)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Team Lead</dt>
          <dd>{personName(item.teamLead)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Created</dt>
          <dd>
            <DateTimeCell value={item.createdAt} /> by{" "}
            {item.createdBy.firstName} {item.createdBy.lastName}
          </dd>
        </div>
      </dl>

      {editing ? (
        <form
          onSubmit={onSave}
          className="space-y-4 rounded border border-amber-200 bg-amber-50/40 p-4"
        >
          <p className="text-xs text-amber-900">
            Saving creates a new ACTIVE record and keeps the previous version as
            SUPERSEDED history.
          </p>
          <TextArea
            label="Primary responsibility"
            required
            rows={3}
            value={primaryResponsibility}
            onChange={(e) => setPrimaryResponsibility(e.target.value)}
          />
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-800">
              What should be done
            </h2>
            {shouldDo.map((value, index) => (
              <input
                key={index}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                required
                value={value}
                onChange={(e) => {
                  const next = [...shouldDo];
                  next[index] = e.target.value;
                  setShouldDo(next);
                }}
              />
            ))}
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-800">
              What should not be done
            </h2>
            {shouldNotDo.map((value, index) => (
              <input
                key={index}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                required
                value={value}
                onChange={(e) => {
                  const next = [...shouldNotDo];
                  next[index] = e.target.value;
                  setShouldNotDo(next);
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save new version"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <section className="surface border-[var(--color-brand)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">
              Primary responsibility
            </p>
            <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">
              {item.primaryResponsibility}
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[var(--radius-md)] border border-[var(--status-success-ring)] bg-[var(--status-success-bg)] p-5">
              <h2 className="text-sm font-semibold text-[var(--status-success)]">
                What should be done
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                {item.shouldDo.map((i, idx) => (
                  <li key={i.id}>
                    <span className="sr-only">Instruction {idx + 1}.</span>
                    {i.text}
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-[var(--radius-md)] border border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] p-5">
              <h2 className="text-sm font-semibold text-[var(--status-danger)]">
                What should not be done
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                {item.shouldNotDo.map((i, idx) => (
                  <li key={i.id}>
                    <span className="sr-only">Restriction {idx + 1}.</span>
                    {i.text}
                  </li>
                ))}
              </ol>
            </section>
          </div>
          {isHistorical && (
            <p className="text-xs text-[var(--color-ink-muted)]">
              This version is historical ({item.status.replaceAll("_", " ").toLowerCase()}) and cannot be edited.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

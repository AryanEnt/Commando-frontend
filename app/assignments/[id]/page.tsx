"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Assignment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  DateTimeCell,
  ErrorState,
  LoadingState,
  Panel,
  ReadOnlyPanel,
  SelectField,
  TextArea,
} from "@/components/ui";

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"COMPLETED" | "EXITED">("COMPLETED");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState("");
  const [initialProblem, setInitialProblem] = useState("");
  const [interventionProvided, setInterventionProvided] = useState("");
  const [improvementObserved, setImprovementObserved] = useState("");
  const [remainingGaps, setRemainingGaps] = useState("");
  const [newCommandoUserId, setNewCommandoUserId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [commandos, setCommandos] = useState<
    { id: string; firstName: string; lastName: string; email: string; role: { code: string } }[]
  >([]);
  /** Anyone with ASSIGNMENT_UPDATE may end or transfer (Commando or Super Admin). */
  const canOperateAssignment = hasPermission("ASSIGNMENT_UPDATE");

  useEffect(() => {
    if (!token || !params.id) return;
    api
      .getAssignment(token, params.id)
      .then((res) => setAssignment(res.data.assignment))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
    if (canOperateAssignment) {
      void api.getUsers(token).then((res) =>
        setCommandos(
          res.data.users.filter((u) => u.role.code === "COMMANDO_EXECUTIVE"),
        ),
      );
    }
  }, [token, params.id, canOperateAssignment]);

  async function onEnd(e: FormEvent) {
    e.preventDefault();
    if (!token || !params.id) return;
    try {
      const res = await api.endAssignment(token, params.id, {
        status,
        completionReason: reason || undefined,
        outcome: outcome || undefined,
        initialProblem: initialProblem || undefined,
        interventionProvided: interventionProvided || undefined,
        improvementObserved: improvementObserved || undefined,
        remainingGaps: remainingGaps || undefined,
      });
      setAssignment(res.data.assignment);
      pushToast("Assignment ended", "success");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Failed to end assignment",
        "error",
      );
    }
  }

  async function onTransfer(e: FormEvent) {
    e.preventDefault();
    if (!token || !params.id || !newCommandoUserId) return;
    try {
      const res = await api.transferAssignment(token, params.id, {
        newCommandoUserId,
        reason: transferReason,
      });
      setAssignment(res.data.assignment);
      pushToast("Assignment transferred", "success");
      router.push(`/assignments/${res.data.assignment.id}`);
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Failed to transfer assignment",
        "error",
      );
    }
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Link href="/assignments" className="text-sm text-slate-600 underline">
          ← Assignments
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!assignment) return <LoadingState />;

  const isActive = assignment.status === "ACTIVE";

  const details = (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div>
        <dt className="text-xs uppercase text-slate-500">Profile</dt>
        <dd className="font-medium">
          {assignment.profile ? (
            <Link
              href={`/profiles/${assignment.profile.id}`}
              className="underline underline-offset-2"
            >
              {assignment.profile.displayName}
            </Link>
          ) : (
            "—"
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-slate-500">Days under Commando</dt>
        <dd className="text-2xl font-semibold tabular-nums">
          {assignment.totalDaysUnderCommando}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-slate-500">Commando</dt>
        <dd>
          {assignment.commando.firstName} {assignment.commando.lastName}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-slate-500">Team Lead</dt>
        <dd>
          {assignment.teamLead.firstName} {assignment.teamLead.lastName}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-slate-500">Team (snapshot)</dt>
        <dd>{assignment.team.name}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-slate-500">Start</dt>
        <dd>
          <DateTimeCell value={assignment.startedAt} />
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-slate-500">End</dt>
        <dd>
          {assignment.endedAt ? (
            <DateTimeCell value={assignment.endedAt} />
          ) : (
            "—"
          )}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase text-slate-500">Completion / exit</dt>
        <dd className="whitespace-pre-wrap">
          {assignment.completionReason ?? "—"}
        </dd>
      </div>
    </dl>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/assignments" className="text-sm text-slate-600 underline">
          ← Assignments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Assignment
        </h1>
        <div className="mt-2">
          <StatusBadge status={assignment.status} />
        </div>
      </div>

      {isActive ? (
        <Panel title="Active assignment" tone="active">
          <div className="p-4">{details}</div>
        </Panel>
      ) : (
        <ReadOnlyPanel title="Assignment history">{details}</ReadOnlyPanel>
      )}

      {canOperateAssignment && isActive && (
        <form
          onSubmit={onEnd}
          className="grid max-w-xl gap-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-slate-900">Complete intervention</h2>
          <p className="text-sm text-slate-600">
            Ends coaching for this Sales Executive and closes any open referral.
            Choose Completed for a normal finish, or Exited if coaching stopped early.
          </p>
          <SelectField
            label="Status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "COMPLETED" | "EXITED")
            }
          >
            <option value="COMPLETED">Completed</option>
            <option value="EXITED">Exited</option>
          </SelectField>
          <TextArea
            label="Completion / exit reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <SelectField
            label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <option value="">Not recorded</option>
            <option value="IMPROVED">Improved</option>
            <option value="PARTIALLY_IMPROVED">Partially improved</option>
            <option value="NOT_IMPROVED">Not improved</option>
            <option value="CONTINUED_MONITORING">Continued monitoring</option>
            <option value="OTHER">Other</option>
          </SelectField>
          <TextArea
            label="Initial problem"
            rows={2}
            value={initialProblem}
            onChange={(e) => setInitialProblem(e.target.value)}
          />
          <TextArea
            label="Intervention provided"
            rows={2}
            value={interventionProvided}
            onChange={(e) => setInterventionProvided(e.target.value)}
          />
          <TextArea
            label="Improvement observed"
            rows={2}
            value={improvementObserved}
            onChange={(e) => setImprovementObserved(e.target.value)}
          />
          <TextArea
            label="Remaining gaps"
            rows={2}
            value={remainingGaps}
            onChange={(e) => setRemainingGaps(e.target.value)}
          />
          <Button type="submit">Complete intervention</Button>
        </form>
      )}

      {canOperateAssignment && isActive && (
        <form
          onSubmit={onTransfer}
          className="grid max-w-xl gap-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-slate-900">Transfer assignment</h2>
          <p className="text-sm text-slate-600">
            This ends the current assignment and starts a new active assignment with another Commando. Two active Commandos cannot exist.
          </p>
          <SearchableSelect
            label="New Commando"
            value={newCommandoUserId}
            onChange={setNewCommandoUserId}
            placeholder="Select Commando…"
            allowClear={false}
            options={commandos
              .filter((u) => u.id !== assignment.commando.id)
              .map((u) => ({
                value: u.id,
                label: `${u.firstName} ${u.lastName}`,
                hint: u.email,
              }))}
          />
          <TextArea
            label="Transfer reason"
            required
            rows={3}
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Review and transfer
          </Button>
        </form>
      )}

      <Button variant="ghost" onClick={() => router.push("/assignments")}>
        Back to list
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type Referral } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { personName } from "@/lib/labels";
import { formatDateTime } from "@/lib/dates";
import {
  hasManagementPacket,
  INTERVENTION_REQUEST_STAGES,
  interventionRequestStageKey,
  isPendingTeamLeadReview,
  referralPageTitle,
  referralPhaseHeadline,
  referralStatusLabel,
} from "@/lib/referral-phase";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ManagementPacketWizard,
  emptyProvideForm,
  type ProvideForm,
} from "@/components/referrals/ManagementPacketWizard";
import { ManagementPacketReadonly } from "@/components/referrals/ManagementPacketReadonly";
import {
  Button,
  ConfirmDialog,
  ErrorState,
  LifecycleStepper,
  LoadingState,
  TextArea,
} from "@/components/ui";

export default function ReferralDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [provideForm, setProvideForm] = useState<ProvideForm>(emptyProvideForm);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getReferral(token, params.id);
        if (!cancelled) {
          setReferral(res.data.referral);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load this referral.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  async function runAction(action: "acknowledge" | "begin" | "complete") {
    if (!token || !params.id) return;
    setBusy(true);
    setError(null);
    try {
      const fn =
        action === "acknowledge"
          ? api.acknowledgeReferral
          : action === "begin"
            ? api.beginReferral
            : api.completeReferral;
      const res = await fn(token, params.id);
      setReferral(res.data.referral);
      setConfirmComplete(false);
      if (action === "begin") {
        pushToast("Intervention started", "success");
      }
      if (action === "complete") {
        pushToast("Handoff closed", "success");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 403
            ? "You don't have permission to perform this action."
            : err.message
          : "Action failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitProvideInformation() {
    if (!token || !params.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.provideReferralInformation(token, params.id, {
        whySalesIsDown: provideForm.whySalesIsDown,
        whatIsTheGap: provideForm.whatIsTheGap,
        detailedSummaryOfGap: provideForm.detailedSummaryOfGap,
        supportAlreadyProvided: provideForm.supportAlreadyProvided,
        supportRequiredFromCommando: provideForm.supportRequiredFromCommando,
        recommendationFocus: provideForm.recommendationFocus,
        priority1: provideForm.priority1,
        priority2: provideForm.priority2,
        priority3: provideForm.priority3,
      });
      setReferral(res.data.referral);
      setConfirmApprove(false);
      pushToast(
        "Approved — management context handed to Commando",
        "success",
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to approve this intervention. Refresh and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    if (!token || !params.id || !rejectReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.rejectReferral(token, params.id, {
        rejectionReason: rejectReason.trim(),
      });
      setReferral(res.data.referral);
      setShowReject(false);
      pushToast("Request rejected", "success");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reject request",
      );
    } finally {
      setBusy(false);
    }
  }

  async function endStuckAssignment() {
    if (!token || !referral?.assignment?.id) return;
    setBusy(true);
    setError(null);
    try {
      await api.endAssignment(token, referral.assignment.id, {
        status: "COMPLETED",
        completionReason: "Intervention completed from referral workspace",
      });
      const res = await api.getReferral(token, referral.id);
      setReferral(res.data.referral);
      setConfirmComplete(false);
      pushToast("Intervention completed", "success");
      router.push(`/profiles/${referral.salesExecutiveProfileId}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not end the active intervention",
      );
    } finally {
      setBusy(false);
    }
  }

  if (error && !referral) {
    return <ErrorState message={error} />;
  }
  if (!referral) {
    return <LoadingState label="Loading intervention request…" />;
  }

  const canProvide =
    hasPermission("REFERRAL_VIEW") &&
    referral.allowedActions.includes("provideInformation");
  const canReject =
    hasPermission("REFERRAL_VIEW") &&
    referral.allowedActions.includes("reject");
  const canAcknowledge =
    hasPermission("REFERRAL_ACKNOWLEDGE") &&
    referral.allowedActions.includes("acknowledge");
  const canBegin =
    hasPermission("REFERRAL_UPDATE_STATUS") &&
    referral.allowedActions.includes("begin");
  const canComplete =
    hasPermission("REFERRAL_UPDATE_STATUS") &&
    referral.allowedActions.includes("complete");
  const hasActiveAssignment = referral.assignment?.status === "ACTIVE";
  const canEndStuckAssignment =
    referral.status === "COMPLETED" &&
    hasActiveAssignment &&
    hasPermission("ASSIGNMENT_UPDATE");

  const profileHref = `/profiles/${referral.salesExecutiveProfileId}`;
  const pendingInfo = isPendingTeamLeadReview(referral);
  const showPacket = hasManagementPacket(referral);
  const headline = referralPhaseHeadline(referral, user?.roleCode);
  const stageKey = interventionRequestStageKey(referral);
  const stepperCurrent =
    stageKey === "REJECTED" ? "TL_REVIEW" : stageKey;
  const isCommando = user?.roleCode === "COMMANDO_EXECUTIVE";
  const isTeamLead =
    user?.roleCode === "TEAM_LEAD" || user?.roleCode === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <nav className="text-sm text-[var(--color-ink-muted)]">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/referrals" className="hover:text-[var(--color-ink)]">
              Interventions
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden>/</span>
            <Link href={profileHref} className="hover:text-[var(--color-ink)]">
              {referral.profileName}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden>/</span>
            <span className="font-medium text-[var(--color-ink)]">
              {referralPageTitle(referral)}
            </span>
          </li>
        </ol>
      </nav>

      <header className="surface px-4 py-5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-xs font-medium text-[var(--color-ink-subtle)]">
                {headline.eyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {referral.profileName}
              </h1>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                Sales Executive, {referral.team.name}
              </p>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <PersonMeta label="Team Lead" person={referral.teamLead} />
              <PersonMeta label="Commando" person={referral.commando} />
              <div>
                <dt className="text-xs font-medium text-[var(--color-ink-subtle)]">
                  Status
                </dt>
                <dd className="mt-0.5 font-semibold text-[var(--color-ink)]">
                  {referralStatusLabel(referral)}
                </dd>
              </div>
            </dl>
          </div>
          <StatusBadge
            status={referral.status}
            label={referralStatusLabel(referral)}
          />
        </div>
      </header>

      {referral.status !== "REJECTED" && (
        <section className="surface px-4 py-4 sm:px-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Intervention progress
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Current phase for this request
            </p>
          </div>
          <LifecycleStepper
            stages={[...INTERVENTION_REQUEST_STAGES]}
            current={stepperCurrent}
          />
        </section>
      )}

      <section className="surface px-4 py-5 sm:px-5">
        <h2 className="text-lg font-semibold tracking-tight">{headline.title}</h2>
        {headline.body ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
            {headline.body}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 border-t border-[var(--color-line)] pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-subtle)]">
              Submitted
            </p>
            <p className="mt-1 font-medium">
              {formatDateTime(referral.createdAt)}
            </p>
          </div>
          {referral.requestReason ? (
            <div className="sm:col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                Request reason
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink)]">
                {referral.requestReason}
              </p>
            </div>
          ) : null}
          {referral.informationProvidedAt ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                Management context provided
              </p>
              <p className="mt-1 font-medium">
                {formatDateTime(referral.informationProvidedAt)}
              </p>
            </div>
          ) : null}
          {referral.rejectedAt ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                Rejected
              </p>
              <p className="mt-1 font-medium">
                {formatDateTime(referral.rejectedAt)}
              </p>
            </div>
          ) : null}
        </div>

        {pendingInfo && isCommando && (
          <div className="mt-5 border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-sm">
            <p className="font-medium text-[var(--color-ink)]">
              What happens next
            </p>
            <p className="mt-1 text-[var(--color-ink-muted)]">
              The Team Lead will review your request and, if approved, provide
              the management context needed to begin the intervention.
            </p>
          </div>
        )}
      </section>

      {error && <ErrorState message={error} />}

      {/* Team Lead: stepped management packet */}
      {canProvide && pendingInfo && isTeamLead && !showReject && (
        <ManagementPacketWizard
          form={provideForm}
          setForm={setProvideForm}
          busy={busy}
          commandoName={personName(referral.commando)}
          assignedSupport={referral.assignedSupport ?? []}
          onApprove={() => setConfirmApprove(true)}
          onReject={() => setShowReject(true)}
        />
      )}

      {/* Reject form — Team Lead only */}
      {canReject && showReject && (
        <section className="surface space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold">Reject Intervention Request</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              This request will be returned as rejected and the Commando will be
              notified. No intervention is started.
            </p>
          </div>
          <TextArea
            label="Reason for rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            rows={4}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={busy || !rejectReason.trim()}
              onClick={() => void submitReject()}
            >
              {busy ? "Rejecting…" : "Reject Request"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setShowReject(false)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}

      {/* Read-only management packet after handoff */}
      {showPacket && !pendingInfo && referral.status !== "REJECTED" && (
        <section className="surface p-4 sm:p-5">
          <ManagementPacketReadonly referral={referral} />
        </section>
      )}

      {/* Primary actions — role + phase specific */}
      {(canAcknowledge ||
        canBegin ||
        canComplete ||
        canEndStuckAssignment ||
        (referral.status === "IN_PROGRESS" && hasActiveAssignment)) && (
        <section className="surface px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            {canAcknowledge && (
              <Button disabled={busy} onClick={() => void runAction("acknowledge")}>
                {busy ? "Working…" : "Acknowledge & Start Intervention"}
              </Button>
            )}
            {canBegin && (
              <Button disabled={busy} onClick={() => void runAction("begin")}>
                {busy ? "Starting…" : "Acknowledge & Start Intervention"}
              </Button>
            )}
            {referral.status === "IN_PROGRESS" && hasActiveAssignment && (
              <Link
                href={profileHref}
                className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
              >
                Open Sales Executive workspace
              </Link>
            )}
            {canComplete && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirmComplete(true)}
              >
                Close handoff
              </Button>
            )}
            {canEndStuckAssignment && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirmComplete(true)}
              >
                Complete intervention
              </Button>
            )}
          </div>

          {referral.status === "IN_PROGRESS" && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { href: `${profileHref}/coaching`, label: "Coaching" },
                { href: `${profileHref}/monitoring`, label: "Monitoring" },
                { href: `${profileHref}/actions`, label: "Assignment" },
                { href: `${profileHref}/reviews`, label: "Weekly reviews" },
                { href: `${profileHref}/eisenhower`, label: "Eisenhower" },
                { href: `${profileHref}/feedback`, label: "Feedback" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmApprove}
        title="Approve Intervention Request?"
        message={`This will:\n\n• Approve the Commando's request\n• Provide the management packet to ${personName(referral.commando)}\n• Start the active intervention workflow\n• Make the management packet read-only for the Commando\n\nYour assessment will remain associated with you as Team Lead.`}
        confirmLabel="Approve & Provide Information"
        busy={busy}
        onConfirm={() => void submitProvideInformation()}
        onCancel={() => setConfirmApprove(false)}
      />

      <ConfirmDialog
        open={confirmComplete}
        title={
          canEndStuckAssignment
            ? "Complete this intervention?"
            : "Close this handoff?"
        }
        message={
          canEndStuckAssignment
            ? "This ends the active assignment. The Sales Executive leaves your active list. Historical records stay available."
            : "This closes the Team Lead request only. The Sales Executive stays on your active list while the assignment is Active."
        }
        confirmLabel={
          canEndStuckAssignment ? "Complete intervention" : "Close handoff"
        }
        busy={busy}
        onConfirm={() =>
          void (canEndStuckAssignment
            ? endStuckAssignment()
            : runAction("complete"))
        }
        onCancel={() => setConfirmComplete(false)}
      />
    </div>
  );
}

function PersonMeta({
  label,
  person,
}: {
  label: string;
  person: { firstName: string; lastName: string; email: string };
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-[var(--color-ink)]">
        {personName(person)}
      </dd>
    </div>
  );
}

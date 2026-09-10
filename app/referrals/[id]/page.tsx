"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type Referral } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { personName } from "@/lib/labels";
import { REFERRAL_STAGES, referralNextAction } from "@/lib/lifecycle";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  ConfirmDialog,
  DateTimeCell,
  ErrorState,
  LifecycleStepper,
  LoadingState,
  PageHeader,
  SectionHeader,
  TextArea,
  TextInput,
} from "@/components/ui";

type ProvideForm = {
  whySalesIsDown: string;
  whatIsTheGap: string;
  detailedSummaryOfGap: string;
  supportAlreadyProvided: string;
  supportRequiredFromCommando: string;
  recommendationFocus: string;
  priority1: string;
  priority2: string;
  priority3: string;
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
};

const emptyProvide: ProvideForm = {
  whySalesIsDown: "",
  whatIsTheGap: "",
  detailedSummaryOfGap: "",
  supportAlreadyProvided: "",
  supportRequiredFromCommando: "",
  recommendationFocus: "",
  priority1: "",
  priority2: "",
  priority3: "",
  strength: "",
  weakness: "",
  opportunity: "",
  threat: "",
};

export default function ReferralDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [provideForm, setProvideForm] = useState<ProvideForm>(emptyProvide);
  const [showProvideForm, setShowProvideForm] = useState(false);
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
          setShowProvideForm(
            res.data.referral.allowedActions.includes("provideInformation"),
          );
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
      if (action === "complete") {
        router.push(`/profiles/${res.data.referral.salesExecutiveProfileId}`);
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
        swot: {
          strength: provideForm.strength,
          weakness: provideForm.weakness,
          opportunity: provideForm.opportunity,
          threat: provideForm.threat,
        },
      });
      setReferral(res.data.referral);
      setShowProvideForm(false);
      pushToast(
        "Information provided — Commando intervention is now active",
        "success",
      );
      router.push(`/profiles/${res.data.referral.salesExecutiveProfileId}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not provide information",
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
    return <LoadingState label="Loading referral…" />;
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
  const swot = referral.teamLeadSwot;
  const profileHref = `/profiles/${referral.salesExecutiveProfileId}`;
  const isCommandoRequest = referral.initiatedBy === "COMMANDO";
  const pendingInfo =
    isCommandoRequest &&
    referral.status === "SUBMITTED" &&
    !referral.informationProvidedAt;

  return (
    <div className="space-y-8">
      <PageHeader
        title={referral.profileName}
        description={
          isCommandoRequest
            ? `Commando request · ${referral.team.name}`
            : `Team Lead handoff · ${referral.team.name}`
        }
        actions={<StatusBadge status={referral.status} />}
      />

      <section className="surface overflow-hidden">
        <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 sm:px-5">
          <SectionHeader
            title="Intervention workflow"
            description={
              pendingInfo
                ? "Waiting for Team Lead to Approve & Provide Information"
                : referralNextAction(referral.status)
            }
            actions={
              hasActiveAssignment ? (
                <Link
                  href={profileHref}
                  className="text-sm font-medium text-[var(--color-brand)] hover:underline"
                >
                  Open coaching workspace
                </Link>
              ) : undefined
            }
          />
          <LifecycleStepper
            stages={[...REFERRAL_STAGES]}
            current={referral.status}
          />
        </div>

        <div className="grid gap-4 border-b border-[var(--color-line)] px-4 py-4 text-sm sm:grid-cols-3 sm:px-5">
          <PersonCell label="Team Lead" person={referral.teamLead} />
          <PersonCell label="Commando" person={referral.commando} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Sales Executive
            </p>
            <p className="mt-1 font-medium text-[var(--color-ink)]">
              {referral.profileName}
            </p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {referral.team.name}
            </p>
          </div>
        </div>

        {referral.requestReason ? (
          <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Commando request reason
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
              {referral.requestReason}
            </p>
          </div>
        ) : null}

        <dl className="grid gap-4 px-4 py-4 text-sm sm:grid-cols-4 sm:px-5">
          <MetaCell
            label="Submitted"
            value={<DateTimeCell value={referral.createdAt} />}
          />
          <MetaCell
            label="Information provided"
            value={
              <DateTimeCell value={referral.informationProvidedAt ?? null} />
            }
          />
          <MetaCell
            label="Acknowledged"
            value={<DateTimeCell value={referral.acknowledgedAt} />}
          />
          <MetaCell
            label="Coaching assignment"
            value={
              referral.assignment ? (
                <Link
                  href={`/assignments/${referral.assignment.id}`}
                  className="font-medium text-[var(--color-brand)] hover:underline"
                >
                  {referral.assignment.status === "ACTIVE"
                    ? "Active"
                    : referral.assignment.status === "COMPLETED"
                      ? "Completed"
                      : referral.assignment.status}
                </Link>
              ) : (
                <span className="text-[var(--color-ink-muted)]">
                  {pendingInfo
                    ? "Starts when Team Lead provides information"
                    : "Created when you Acknowledge"}
                </span>
              )
            }
          />
        </dl>

        {(canProvide ||
          canReject ||
          canAcknowledge ||
          canBegin ||
          canComplete ||
          canEndStuckAssignment) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 sm:px-5">
            {canProvide && (
              <Button disabled={busy} onClick={() => setShowProvideForm(true)}>
                Approve &amp; Provide Information
              </Button>
            )}
            {canReject && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setShowReject(true)}
              >
                Reject Request
              </Button>
            )}
            {canAcknowledge && (
              <Button disabled={busy} onClick={() => runAction("acknowledge")}>
                Acknowledge
              </Button>
            )}
            {canBegin && (
              <Button disabled={busy} onClick={() => runAction("begin")}>
                Start coaching
              </Button>
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
            <p className="basis-full text-xs text-[var(--color-ink-muted)]">
              {pendingInfo
                ? "Approve & Provide Information hands the management packet to the Commando and starts the active intervention. Your normal operational writes for this SE pause until the intervention ends."
                : "Acknowledge starts the active assignment. Closing the handoff only archives this request — coaching stays Active until you Complete intervention on the Sales Executive workspace."}
            </p>
          </div>
        )}
      </section>

      {error && <ErrorState message={error} />}

      {canReject && showReject && (
        <section className="surface space-y-4 p-4 sm:p-5">
          <SectionHeader
            title="Reject Commando request"
            description="The Sales Executive stays under your normal management. No intervention is started."
          />
          <TextArea
            label="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-2">
            <Button
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

      {canProvide && showProvideForm && (
        <section className="surface space-y-4 p-4 sm:p-5">
          <SectionHeader
            title="Approve & Provide Information"
            description="Hand over the management context. Commando receives this read-only; you remain the owner of the assessment."
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <TextArea
              label="Why sales is down"
              value={provideForm.whySalesIsDown}
              onChange={(e) =>
                setProvideForm((f) => ({
                  ...f,
                  whySalesIsDown: e.target.value,
                }))
              }
              required
            />
            <TextArea
              label="What is the gap"
              value={provideForm.whatIsTheGap}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, whatIsTheGap: e.target.value }))
              }
              required
            />
            <TextArea
              label="Detailed summary of gap"
              className="lg:col-span-2"
              value={provideForm.detailedSummaryOfGap}
              onChange={(e) =>
                setProvideForm((f) => ({
                  ...f,
                  detailedSummaryOfGap: e.target.value,
                }))
              }
              required
            />
            <TextArea
              label="Support already provided"
              value={provideForm.supportAlreadyProvided}
              onChange={(e) =>
                setProvideForm((f) => ({
                  ...f,
                  supportAlreadyProvided: e.target.value,
                }))
              }
              required
            />
            <TextArea
              label="Support required from Commando"
              value={provideForm.supportRequiredFromCommando}
              onChange={(e) =>
                setProvideForm((f) => ({
                  ...f,
                  supportRequiredFromCommando: e.target.value,
                }))
              }
              required
            />
            <TextArea
              label="Recommendation focus"
              className="lg:col-span-2"
              value={provideForm.recommendationFocus}
              onChange={(e) =>
                setProvideForm((f) => ({
                  ...f,
                  recommendationFocus: e.target.value,
                }))
              }
              required
            />
            <TextInput
              label="Priority 1"
              value={provideForm.priority1}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, priority1: e.target.value }))
              }
              required
            />
            <TextInput
              label="Priority 2"
              value={provideForm.priority2}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, priority2: e.target.value }))
              }
              required
            />
            <TextInput
              label="Priority 3"
              value={provideForm.priority3}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, priority3: e.target.value }))
              }
              required
            />
            <TextArea
              label="Strengths"
              value={provideForm.strength}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, strength: e.target.value }))
              }
              required
            />
            <TextArea
              label="Weaknesses"
              value={provideForm.weakness}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, weakness: e.target.value }))
              }
              required
            />
            <TextArea
              label="Opportunities"
              value={provideForm.opportunity}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, opportunity: e.target.value }))
              }
              required
            />
            <TextArea
              label="Threats"
              value={provideForm.threat}
              onChange={(e) =>
                setProvideForm((f) => ({ ...f, threat: e.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() => void submitProvideInformation()}
            >
              {busy ? "Submitting…" : "Approve & Provide Information"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setShowProvideForm(false)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}

      {!pendingInfo && (
        <section className="space-y-3">
          <SectionHeader
            title="Team Lead assessment"
            description="Submitted with this referral. Read-only for Commando."
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Why sales is down" value={referral.whySalesIsDown} />
            <Field label="What is the gap" value={referral.whatIsTheGap} />
            <Field
              label="Detailed summary of gap"
              value={referral.detailedSummaryOfGap}
              className="lg:col-span-2"
            />
            <Field
              label="Support already provided"
              value={referral.supportAlreadyProvided}
            />
            <Field
              label="Support required from Commando"
              value={referral.supportRequiredFromCommando}
            />
            <Field
              label="Recommendation focus"
              value={referral.recommendationFocus}
              className="lg:col-span-2"
            />
          </div>

          {(referral.priority1 || referral.priority2 || referral.priority3) && (
            <div className="surface p-4 sm:p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Top priorities
              </h3>
              <ol className="mt-3 space-y-2">
                {[referral.priority1, referral.priority2, referral.priority3]
                  .filter(Boolean)
                  .map((priority, index) => (
                    <li
                      key={`${index}-${priority}`}
                      className="flex gap-3 text-sm"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-xs font-semibold text-[var(--color-brand)]">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-[var(--color-ink)]">
                        {priority}
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {!pendingInfo && (
        <section className="space-y-3">
          <SectionHeader
            title="Team Lead SWOT"
            description="Captured when this referral was submitted."
          />
          {swot ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SwotCell title="Strengths" value={swot.strength} tone="strength" />
              <SwotCell
                title="Weaknesses"
                value={swot.weakness}
                tone="weakness"
              />
              <SwotCell
                title="Opportunities"
                value={swot.opportunity}
                tone="opportunity"
              />
              <SwotCell title="Threats" value={swot.threat} tone="threat" />
            </div>
          ) : (
            <div className="surface border-dashed p-6 text-sm text-[var(--color-ink-muted)]">
              No Team Lead SWOT is attached to this referral.
            </div>
          )}
        </section>
      )}

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

function PersonCell({
  label,
  person,
}: {
  label: string;
  person: { firstName: string; lastName: string; email: string };
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </p>
      <p className="mt-1 font-medium text-[var(--color-ink)]">
        {personName(person)}
      </p>
      <p className="text-xs text-[var(--color-ink-muted)]">{person.email}</p>
    </div>
  );
}

function MetaCell({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`surface p-4 sm:p-5 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function SwotCell({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "strength" | "weakness" | "opportunity" | "threat";
}) {
  const accent =
    tone === "strength"
      ? "border-l-[var(--color-brand)]"
      : tone === "weakness"
        ? "border-l-[var(--status-danger)]"
        : tone === "opportunity"
          ? "border-l-[var(--color-accent)]"
          : "border-l-[var(--color-attention)]";

  return (
    <div className={`surface border-l-4 p-4 sm:p-5 ${accent}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {title}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type ProfileListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { personName } from "@/lib/labels";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  ErrorState,
  LoadingState,
  TextArea,
  TextInput,
} from "@/components/ui";

const STEPS = [
  "Identify",
  "Diagnose",
  "Support",
  "Prioritize",
  "SWOT",
  "Review",
] as const;

type FormState = {
  salesExecutiveProfileId: string;
  commandoUserId: string;
  profileName: string;
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

const empty: FormState = {
  salesExecutiveProfileId: "",
  commandoUserId: "",
  profileName: "",
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

export default function NewReferralPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewReferralForm />
    </Suspense>
  );
}

function NewReferralForm() {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProfileId = searchParams.get("profileId") ?? "";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(empty);
  const [selectedProfile, setSelectedProfile] = useState<ProfileListItem | null>(null);
  const [commandos, setCommandos] = useState<
    { id: string; firstName: string; lastName: string; email: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !hasPermission("REFERRAL_CREATE")) return;
    void api.getReferralCommandos(token).then((res) => {
      setCommandos(res.data.commandos);
    });
  }, [token, hasPermission]);

  useEffect(() => {
    if (!token || !preselectedProfileId) return;
    void api.getProfile(token, preselectedProfileId).then((res) => {
      const p = res.data.profile;
      setSelectedProfile({
        id: p.id,
        displayName: p.displayName,
        employeeCode: p.employeeCode,
        teamId: p.teamId,
        team: p.team,
        user: p.user,
        currentAssignment: p.currentAssignment,
      });
      setForm((prev) => ({
        ...prev,
        salesExecutiveProfileId: p.id,
        profileName: p.displayName,
      }));
    }).catch(() => undefined);
  }, [token, preselectedProfileId]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(current: number): boolean {
    const errors: Record<string, string> = {};
    if (current === 0) {
      if (!form.salesExecutiveProfileId) errors.salesExecutiveProfileId = "Select a Sales Executive";
      if (!form.commandoUserId) errors.commandoUserId = "Select a Commando";
      if (!form.profileName.trim()) errors.profileName = "Required";
    }
    if (current === 1) {
      if (!form.whySalesIsDown.trim()) errors.whySalesIsDown = "Required";
      if (!form.whatIsTheGap.trim()) errors.whatIsTheGap = "Required";
      if (!form.detailedSummaryOfGap.trim()) errors.detailedSummaryOfGap = "Required";
    }
    if (current === 2) {
      if (!form.supportAlreadyProvided.trim()) errors.supportAlreadyProvided = "Required";
      if (!form.supportRequiredFromCommando.trim()) {
        errors.supportRequiredFromCommando = "Required";
      }
    }
    if (current === 3) {
      if (!form.recommendationFocus.trim()) errors.recommendationFocus = "Required";
      if (!form.priority1.trim()) errors.priority1 = "Required";
      if (!form.priority2.trim()) errors.priority2 = "Required";
      if (!form.priority3.trim()) errors.priority3 = "Required";
    }
    if (current === 4) {
      if (!form.strength.trim()) errors.strength = "Required";
      if (!form.weakness.trim()) errors.weakness = "Required";
      if (!form.opportunity.trim()) errors.opportunity = "Required";
      if (!form.threat.trim()) errors.threat = "Required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const commandoName = useMemo(() => {
    const c = commandos.find((c) => c.id === form.commandoUserId);
    return c ? `${c.firstName} ${c.lastName}` : "—";
  }, [commandos, form.commandoUserId]);

  async function onSubmit() {
    if (!token || !validateStep(4)) {
      setStep(4);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createReferral(token, {
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        commandoUserId: form.commandoUserId,
        profileName: form.profileName.trim(),
        whySalesIsDown: form.whySalesIsDown.trim(),
        whatIsTheGap: form.whatIsTheGap.trim(),
        detailedSummaryOfGap: form.detailedSummaryOfGap.trim(),
        supportAlreadyProvided: form.supportAlreadyProvided.trim(),
        supportRequiredFromCommando: form.supportRequiredFromCommando.trim(),
        recommendationFocus: form.recommendationFocus.trim(),
        priority1: form.priority1.trim(),
        priority2: form.priority2.trim(),
        priority3: form.priority3.trim(),
        swot: {
          strength: form.strength.trim(),
          weakness: form.weakness.trim(),
          opportunity: form.opportunity.trim(),
          threat: form.threat.trim(),
        },
      });
      pushToast("Intervention submitted to Commando", "success");
      router.push(`/referrals/${res.data.referral.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "We couldn't submit the intervention. Please try again.";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("REFERRAL_CREATE") || user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Referrals are created by Team Leads as part of the operational workflow." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">
          New intervention
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Identify the problem, record the SWOT, then submit to Commando. The original assessment is kept in history.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium ${
              index === step
                ? "bg-[var(--color-brand)] text-white"
                : index < step
                  ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]"
            }`}
          >
            {String(index + 1).padStart(2, "0")} {label}
          </li>
        ))}
      </ol>

      <div className="space-y-5 border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        {step === 0 && (
          <div className="space-y-4">
            <ProfileSearchSelect
              value={form.salesExecutiveProfileId}
              onChange={(id, profile?: ProfileListItem) => {
                setField("salesExecutiveProfileId", id);
                setSelectedProfile(profile ?? null);
                if (profile) {
                  setField("profileName", profile.displayName);
                  if (profile.currentAssignment?.commando?.id) {
                    setField("commandoUserId", profile.currentAssignment.commando.id);
                  }
                }
              }}
            />
            {fieldErrors.salesExecutiveProfileId && (
              <p className="text-xs text-red-600">{fieldErrors.salesExecutiveProfileId}</p>
            )}
            {selectedProfile?.currentAssignment && (
              <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 text-sm">
                <p className="font-medium">Already assigned</p>
                <p className="mt-1 text-[var(--color-ink-muted)]">
                  {selectedProfile.displayName} is currently assigned to{" "}
                  {personName(selectedProfile.currentAssignment.commando)}.
                </p>
                <div className="mt-2">
                  <StatusBadge status={selectedProfile.currentAssignment.status} />
                </div>
                <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                  Referral must go to that Commando. Another Commando cannot be selected while this assignment is active.
                </p>
              </div>
            )}
            <TextInput
              label="Sales Executive name"
              required
              value={form.profileName}
              onChange={(e) => setField("profileName", e.target.value)}
              error={fieldErrors.profileName}
            />
            <SearchableSelect
              label="Commando"
              value={form.commandoUserId}
              onChange={(id) => {
                if (selectedProfile?.currentAssignment?.commando?.id) return;
                setField("commandoUserId", id);
              }}
              placeholder="Select Commando…"
              allowClear={false}
              disabled={Boolean(selectedProfile?.currentAssignment?.commando?.id)}
              options={
                selectedProfile?.currentAssignment?.commando
                  ? commandos
                      .filter((c) => c.id === selectedProfile.currentAssignment!.commando.id)
                      .map((c) => ({
                        value: c.id,
                        label: `${c.firstName} ${c.lastName}`,
                        hint: c.email,
                      }))
                  : commandos.map((c) => ({
                      value: c.id,
                      label: `${c.firstName} ${c.lastName}`,
                      hint: c.email,
                    }))
              }
            />
            {fieldErrors.commandoUserId && (
              <p className="text-xs text-red-600">{fieldErrors.commandoUserId}</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <TextArea
              label="Root cause"
              hint="Why is this Sales Executive underperforming?"
              required
              rows={3}
              value={form.whySalesIsDown}
              onChange={(e) => setField("whySalesIsDown", e.target.value)}
              error={fieldErrors.whySalesIsDown}
            />
            <TextArea
              label="The gap"
              hint="What is missing in skill, process, or behaviour?"
              required
              rows={3}
              value={form.whatIsTheGap}
              onChange={(e) => setField("whatIsTheGap", e.target.value)}
              error={fieldErrors.whatIsTheGap}
            />
            <TextArea
              label="Detailed gap"
              hint="Evidence the Commando should start from."
              required
              rows={5}
              value={form.detailedSummaryOfGap}
              onChange={(e) => setField("detailedSummaryOfGap", e.target.value)}
              error={fieldErrors.detailedSummaryOfGap}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <TextArea
              label="Management support already provided"
              hint="What has the Team Lead already tried?"
              required
              rows={4}
              value={form.supportAlreadyProvided}
              onChange={(e) => setField("supportAlreadyProvided", e.target.value)}
              error={fieldErrors.supportAlreadyProvided}
            />
            <TextArea
              label="What is needed from Commando"
              hint="Be specific about the coaching the Commando should provide."
              required
              rows={4}
              value={form.supportRequiredFromCommando}
              onChange={(e) => setField("supportRequiredFromCommando", e.target.value)}
              error={fieldErrors.supportRequiredFromCommando}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <TextArea
              label="Recommended focus"
              hint="The one area the Commando should concentrate on first."
              required
              rows={3}
              value={form.recommendationFocus}
              onChange={(e) => setField("recommendationFocus", e.target.value)}
              error={fieldErrors.recommendationFocus}
            />
            <TextInput
              label="Priority 1"
              required
              value={form.priority1}
              onChange={(e) => setField("priority1", e.target.value)}
              error={fieldErrors.priority1}
            />
            <TextInput
              label="Priority 2"
              required
              value={form.priority2}
              onChange={(e) => setField("priority2", e.target.value)}
              error={fieldErrors.priority2}
            />
            <TextInput
              label="Priority 3"
              required
              value={form.priority3}
              onChange={(e) => setField("priority3", e.target.value)}
              error={fieldErrors.priority3}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-ink-muted)]">
              SWOT is required before submission. This becomes a permanent Team Lead SWOT record.
            </p>
            <TextArea label="Strengths" required rows={3} value={form.strength} onChange={(e) => setField("strength", e.target.value)} error={fieldErrors.strength} />
            <TextArea label="Weaknesses" required rows={3} value={form.weakness} onChange={(e) => setField("weakness", e.target.value)} error={fieldErrors.weakness} />
            <TextArea label="Opportunities" required rows={3} value={form.opportunity} onChange={(e) => setField("opportunity", e.target.value)} error={fieldErrors.opportunity} />
            <TextArea label="Threats" required rows={3} value={form.threat} onChange={(e) => setField("threat", e.target.value)} error={fieldErrors.threat} />
          </div>
        )}

        {step === 5 && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-[var(--color-ink-muted)]">Sales Executive</dt>
              <dd className="font-medium">{form.profileName}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Commando</dt>
              <dd className="font-medium">{commandoName}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Root cause</dt>
              <dd>{form.whySalesIsDown}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Gap</dt>
              <dd>{form.whatIsTheGap}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--color-ink-muted)]">Top 3 priorities</dt>
              <dd>
                1. {form.priority1}
                <br />
                2. {form.priority2}
                <br />
                3. {form.priority3}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--color-ink-muted)]">SWOT</dt>
              <dd>
                S: {form.strength}
                <br />
                W: {form.weakness}
                <br />
                O: {form.opportunity}
                <br />
                T: {form.threat}
              </dd>
            </div>
          </dl>
        )}

        {error && <ErrorState message={error} />}

        <div className="flex justify-between gap-2 pt-2">
          {step === 0 ? (
            <Button type="button" variant="secondary" onClick={() => router.push("/referrals")}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => validateStep(step) && setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit to Commando"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

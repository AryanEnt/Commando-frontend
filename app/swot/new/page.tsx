"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName } from "@/lib/labels";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { SwotPointsEditor } from "@/components/swot/SwotPointsEditor";
import {
  emptySwotPoints,
  pointsFromSwotField,
  type SwotPointDraft,
} from "@/lib/swot-points";
import {
  Button,
  ErrorState,
  LoadingState,
} from "@/components/ui";

type SubjectKind = "SE" | "SSE";

type FormState = {
  salesExecutiveProfileId: string;
  subjectUserId: string;
  strength: SwotPointDraft[];
  weakness: SwotPointDraft[];
  opportunity: SwotPointDraft[];
  threat: SwotPointDraft[];
};

const SWOT_CREATOR_ROLES = new Set([
  "TEAM_LEAD",
  "COMMANDO_EXECUTIVE",
  "SALES_EXECUTIVE",
  "SALES_SUPPORT_EXECUTIVE",
]);

export default function NewSwotPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewSwotForm />
    </Suspense>
  );
}

function toPayload(points: SwotPointDraft[], forceVisible: boolean) {
  return points
    .map((p) => ({
      text: p.text.trim(),
      visible: forceVisible ? true : p.visible,
    }))
    .filter((p) => p.text.length > 0);
}

function NewSwotForm() {
  const { token, hasPermission, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedProfileId = searchParams.get("profileId") ?? "";
  const lockedSubjectUserId =
    searchParams.get("subjectUserId") ??
    searchParams.get("executiveUserId") ??
    "";
  const returnTo = searchParams.get("returnTo");

  const isSse = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";
  const isSe = user?.roleCode === "SALES_EXECUTIVE";
  const isManager =
    user?.roleCode === "TEAM_LEAD" || user?.roleCode === "COMMANDO_EXECUTIVE";

  const [subjectKind, setSubjectKind] = useState<SubjectKind>(
    lockedSubjectUserId ? "SSE" : "SE",
  );
  const [form, setForm] = useState<FormState>({
    salesExecutiveProfileId: lockedProfileId,
    subjectUserId: lockedSubjectUserId,
    strength: emptySwotPoints(),
    weakness: emptySwotPoints(),
    opportunity: emptySwotPoints(),
    threat: emptySwotPoints(),
  });
  const [lockedProfileName, setLockedProfileName] = useState<string | null>(
    null,
  );
  const [ownProfileName, setOwnProfileName] = useState<string | null>(null);
  const [sseSubjects, setSseSubjects] = useState<
    Array<{ id: string; firstName: string; lastName: string; email: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate =
    Boolean(user) &&
    hasPermission("SWOT_CREATE") &&
    SWOT_CREATOR_ROLES.has(user!.roleCode);
  const showVisibility = isManager;

  useEffect(() => {
    if (lockedProfileId) {
      setSubjectKind("SE");
      setForm((prev) => ({
        ...prev,
        salesExecutiveProfileId: lockedProfileId,
        subjectUserId: "",
      }));
    }
  }, [lockedProfileId]);

  useEffect(() => {
    if (lockedSubjectUserId) {
      setSubjectKind("SSE");
      setForm((prev) => ({
        ...prev,
        subjectUserId: lockedSubjectUserId,
        salesExecutiveProfileId: "",
      }));
    }
  }, [lockedSubjectUserId]);

  useEffect(() => {
    if (!token || !lockedProfileId) return;
    void api
      .getProfile(token, lockedProfileId)
      .then((res) => setLockedProfileName(res.data.profile.displayName))
      .catch(() => setLockedProfileName(null));
  }, [token, lockedProfileId]);

  useEffect(() => {
    if (!token || !isManager) return;
    void api
      .getSwotSupportSubjects(token)
      .then((res) => setSseSubjects(res.data.subjects))
      .catch(() => setSseSubjects([]));
  }, [token, isManager]);

  useEffect(() => {
    if (!token || !user) return;
    if (isSse) return;
    if (subjectKind !== "SE" || !form.salesExecutiveProfileId) return;

    const source =
      user.roleCode === "TEAM_LEAD"
        ? "TEAM_LEAD"
        : user.roleCode === "COMMANDO_EXECUTIVE"
          ? "COMMANDO"
          : user.roleCode === "SALES_EXECUTIVE"
            ? "SALES_EXECUTIVE"
            : null;
    if (!source) return;
    void api
      .getSwotList(token, {
        profileId: form.salesExecutiveProfileId,
        source,
        pageSize: 5,
      })
      .then((res) => {
        const latest = res.data.items[0];
        if (!latest) return;
        setForm((prev) => ({
          ...prev,
          strength: prev.strength.some((p) => p.text.trim())
            ? prev.strength
            : pointsFromSwotField(latest.strengthPoints, latest.strength),
          weakness: prev.weakness.some((p) => p.text.trim())
            ? prev.weakness
            : pointsFromSwotField(latest.weaknessPoints, latest.weakness),
          opportunity: prev.opportunity.some((p) => p.text.trim())
            ? prev.opportunity
            : pointsFromSwotField(
                latest.opportunityPoints,
                latest.opportunity,
              ),
          threat: prev.threat.some((p) => p.text.trim())
            ? prev.threat
            : pointsFromSwotField(latest.threatPoints, latest.threat),
        }));
      })
      .catch(() => undefined);
  }, [token, form.salesExecutiveProfileId, user, subjectKind, isSse]);

  useEffect(() => {
    if (!token || !isManager || subjectKind !== "SSE" || !form.subjectUserId) {
      return;
    }
    const source =
      user?.roleCode === "TEAM_LEAD"
        ? "TEAM_LEAD"
        : user?.roleCode === "COMMANDO_EXECUTIVE"
          ? "COMMANDO"
          : null;
    if (!source) return;
    void api
      .getSwotList(token, {
        subjectUserId: form.subjectUserId,
        source,
        pageSize: 5,
      })
      .then((res) => {
        const latest = res.data.items[0];
        if (!latest) return;
        setForm((prev) => ({
          ...prev,
          strength: prev.strength.some((p) => p.text.trim())
            ? prev.strength
            : pointsFromSwotField(latest.strengthPoints, latest.strength),
          weakness: prev.weakness.some((p) => p.text.trim())
            ? prev.weakness
            : pointsFromSwotField(latest.weaknessPoints, latest.weakness),
          opportunity: prev.opportunity.some((p) => p.text.trim())
            ? prev.opportunity
            : pointsFromSwotField(
                latest.opportunityPoints,
                latest.opportunity,
              ),
          threat: prev.threat.some((p) => p.text.trim())
            ? prev.threat
            : pointsFromSwotField(latest.threatPoints, latest.threat),
        }));
      })
      .catch(() => undefined);
  }, [token, form.subjectUserId, user, subjectKind, isManager]);

  useEffect(() => {
    if (!token || !isSe) return;
    void api.getProfiles(token).then((res) => {
      const own = res.data.profiles[0];
      if (own) {
        setForm((prev) => ({ ...prev, salesExecutiveProfileId: own.id }));
        setOwnProfileName(own.displayName);
      }
    });
  }, [token, isSe]);

  useEffect(() => {
    if (!token || !isSse) return;
    void api
      .getSwotList(token, { source: "SALES_SUPPORT_EXECUTIVE", pageSize: 5 })
      .then((res) => {
        const latest = res.data.items[0];
        if (!latest) return;
        setForm((prev) => ({
          ...prev,
          strength: prev.strength.some((p) => p.text.trim())
            ? prev.strength
            : pointsFromSwotField(latest.strengthPoints, latest.strength),
          weakness: prev.weakness.some((p) => p.text.trim())
            ? prev.weakness
            : pointsFromSwotField(latest.weaknessPoints, latest.weakness),
          opportunity: prev.opportunity.some((p) => p.text.trim())
            ? prev.opportunity
            : pointsFromSwotField(
                latest.opportunityPoints,
                latest.opportunity,
              ),
          threat: prev.threat.some((p) => p.text.trim())
            ? prev.threat
            : pointsFromSwotField(latest.threatPoints, latest.threat),
        }));
      })
      .catch(() => undefined);
  }, [token, isSse]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (isManager && subjectKind === "SE" && !form.salesExecutiveProfileId) {
      setError("Select a Sales Executive profile");
      return;
    }
    if (isManager && subjectKind === "SSE" && !form.subjectUserId) {
      setError("Select a Sales Support Executive");
      return;
    }
    if (isSe && !form.salesExecutiveProfileId) {
      setError("Could not resolve your Sales Executive profile");
      return;
    }

    const forceVisible = isSe || isSse;
    const strengthPoints = toPayload(form.strength, Boolean(forceVisible));
    const weaknessPoints = toPayload(form.weakness, Boolean(forceVisible));
    const opportunityPoints = toPayload(
      form.opportunity,
      Boolean(forceVisible),
    );
    const threatPoints = toPayload(form.threat, Boolean(forceVisible));
    if (
      !strengthPoints.length ||
      !weaknessPoints.length ||
      !opportunityPoints.length ||
      !threatPoints.length
    ) {
      setError("Add at least one point in every SWOT box");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body =
        isSse || (isManager && subjectKind === "SSE")
          ? {
              ...(isSse
                ? { subjectType: "EXECUTIVE" as const }
                : {
                    subjectType: "EXECUTIVE" as const,
                    executiveUserId: form.subjectUserId,
                    subjectUserId: form.subjectUserId,
                  }),
              strengthPoints,
              weaknessPoints,
              opportunityPoints,
              threatPoints,
            }
          : {
              subjectType: "PROFILE" as const,
              salesExecutiveProfileId: form.salesExecutiveProfileId,
              strengthPoints,
              weaknessPoints,
              opportunityPoints,
              threatPoints,
            };

      const res = await api.createSwot(token, body);
      if (returnTo) {
        router.push(returnTo);
      } else if (isSse) {
        router.push("/swot");
      } else if (isManager && subjectKind === "SSE" && form.subjectUserId) {
        router.push(`/support/${form.subjectUserId}/swot`);
      } else if (form.salesExecutiveProfileId) {
        router.push(`/profiles/${form.salesExecutiveProfileId}/swot`);
      } else {
        router.push(`/swot/${res.data.swot.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Checking permissions…" />;
  }

  if (user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Super Admin is governance-only and cannot create SWOT analyses. Sign in as Commando, Team Lead, Sales Executive, or Sales Support." />
    );
  }

  if (!canCreate) {
    return (
      <ErrorState message="You do not have permission to create SWOT analyses." />
    );
  }

  const sourceHint =
    user?.roleCode === "TEAM_LEAD"
      ? "TEAM_LEAD"
      : user?.roleCode === "COMMANDO_EXECUTIVE"
        ? "COMMANDO"
        : user?.roleCode === "SALES_SUPPORT_EXECUTIVE"
          ? "SALES_SUPPORT_EXECUTIVE"
          : "SALES_EXECUTIVE";

  const backHref =
    returnTo ||
    (form.salesExecutiveProfileId
      ? `/profiles/${form.salesExecutiveProfileId}`
      : "/swot");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isSse ? "Add my SWOT" : "Update SWOT"}
        </h1>
        <p className="text-sm text-slate-600">
          Source will be recorded as <strong>{sourceHint}</strong>. Saving
          creates a <strong>new version</strong> — previous SWOT content stays
          available in history.
        </p>
        {showVisibility ? (
          <p className="mt-2 text-sm text-slate-600">
            Use the eye icon on each point to share it with the subject
            executive.
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {isManager && !lockedProfileId && !lockedSubjectUserId ? (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-[var(--color-ink)]">
              SWOT for
            </legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="subjectKind"
                  checked={subjectKind === "SE"}
                  onChange={() => {
                    setSubjectKind("SE");
                    setForm((p) => ({ ...p, subjectUserId: "" }));
                  }}
                />
                Sales Executive
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="subjectKind"
                  checked={subjectKind === "SSE"}
                  onChange={() => {
                    setSubjectKind("SSE");
                    setForm((p) => ({ ...p, salesExecutiveProfileId: "" }));
                  }}
                />
                Sales Support Executive
              </label>
            </div>
          </fieldset>
        ) : null}

        {isSse ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
            Self SWOT for your Sales Support account
          </p>
        ) : null}

        {isSe || (isManager && subjectKind === "SE") ? (
          lockedProfileId ? (
            <p className="text-sm text-slate-700">
              Sales Executive:{" "}
              <strong>{lockedProfileName ?? lockedProfileId}</strong>
            </p>
          ) : isSe ? (
            <p className="text-sm text-slate-700">
              Sales Executive: <strong>{ownProfileName ?? "Your profile"}</strong>
            </p>
          ) : (
            <ProfileSearchSelect
              label="Sales Executive"
              value={form.salesExecutiveProfileId}
              onChange={(id) =>
                setForm((prev) => ({ ...prev, salesExecutiveProfileId: id }))
              }
            />
          )
        ) : null}

        {isManager && subjectKind === "SSE" ? (
          lockedSubjectUserId ? (
            <p className="text-sm text-slate-700">
              Sales Support:{" "}
              <strong>
                {personName(
                  sseSubjects.find((s) => s.id === lockedSubjectUserId) ?? {
                    firstName: "Support",
                    lastName: "Executive",
                  },
                )}
              </strong>
            </p>
          ) : (
            <SearchableSelect
              label="Sales Support Executive"
              value={form.subjectUserId}
              onChange={(id) =>
                setForm((prev) => ({ ...prev, subjectUserId: id }))
              }
              placeholder="Select Sales Support…"
              allowClear={false}
              options={sseSubjects.map((s) => ({
                value: s.id,
                label: personName(s),
              }))}
            />
          )
        ) : null}

        <div className="space-y-4">
          <SwotPointsEditor
            label="Strengths"
            points={form.strength}
            onChange={(strength) => setForm((prev) => ({ ...prev, strength }))}
            showVisibility={showVisibility}
          />
          <SwotPointsEditor
            label="Weaknesses"
            points={form.weakness}
            onChange={(weakness) => setForm((prev) => ({ ...prev, weakness }))}
            showVisibility={showVisibility}
          />
          <SwotPointsEditor
            label="Opportunities"
            points={form.opportunity}
            onChange={(opportunity) =>
              setForm((prev) => ({ ...prev, opportunity }))
            }
            showVisibility={showVisibility}
          />
          <SwotPointsEditor
            label="Threats"
            points={form.threat}
            onChange={(threat) => setForm((prev) => ({ ...prev, threat }))}
            showVisibility={showVisibility}
          />
        </div>

        {error ? <ErrorState message={error} /> : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => router.push(backHref)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save SWOT"}
          </Button>
        </div>
      </form>
    </div>
  );
}

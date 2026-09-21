"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
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

type FormState = {
  salesExecutiveProfileId: string;
  strength: SwotPointDraft[];
  weakness: SwotPointDraft[];
  opportunity: SwotPointDraft[];
  threat: SwotPointDraft[];
};

const SWOT_CREATOR_ROLES = new Set([
  "TEAM_LEAD",
  "COMMANDO_EXECUTIVE",
  "SALES_EXECUTIVE",
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
  const returnTo = searchParams.get("returnTo");

  const [form, setForm] = useState<FormState>({
    salesExecutiveProfileId: lockedProfileId,
    strength: emptySwotPoints(),
    weakness: emptySwotPoints(),
    opportunity: emptySwotPoints(),
    threat: emptySwotPoints(),
  });
  const [lockedProfileName, setLockedProfileName] = useState<string | null>(
    null,
  );
  const [ownProfileName, setOwnProfileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate =
    Boolean(user) &&
    hasPermission("SWOT_CREATE") &&
    SWOT_CREATOR_ROLES.has(user!.roleCode);
  const showVisibility =
    user?.roleCode === "TEAM_LEAD" || user?.roleCode === "COMMANDO_EXECUTIVE";

  useEffect(() => {
    if (lockedProfileId) {
      setForm((prev) => ({
        ...prev,
        salesExecutiveProfileId: lockedProfileId,
      }));
    }
  }, [lockedProfileId]);

  useEffect(() => {
    if (!token || !lockedProfileId) return;
    void api
      .getProfile(token, lockedProfileId)
      .then((res) => setLockedProfileName(res.data.profile.displayName))
      .catch(() => setLockedProfileName(null));
  }, [token, lockedProfileId]);

  useEffect(() => {
    if (!token || !form.salesExecutiveProfileId || !user) return;
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
          strength:
            prev.strength.some((p) => p.text.trim())
              ? prev.strength
              : pointsFromSwotField(latest.strengthPoints, latest.strength),
          weakness:
            prev.weakness.some((p) => p.text.trim())
              ? prev.weakness
              : pointsFromSwotField(latest.weaknessPoints, latest.weakness),
          opportunity:
            prev.opportunity.some((p) => p.text.trim())
              ? prev.opportunity
              : pointsFromSwotField(
                  latest.opportunityPoints,
                  latest.opportunity,
                ),
          threat:
            prev.threat.some((p) => p.text.trim())
              ? prev.threat
              : pointsFromSwotField(latest.threatPoints, latest.threat),
        }));
      })
      .catch(() => undefined);
  }, [token, form.salesExecutiveProfileId, user]);

  useEffect(() => {
    if (!token || user?.roleCode !== "SALES_EXECUTIVE") return;
    void api.getProfiles(token).then((res) => {
      const own = res.data.profiles[0];
      if (own) {
        setForm((prev) => ({ ...prev, salesExecutiveProfileId: own.id }));
        setOwnProfileName(own.displayName);
      }
    });
  }, [token, user?.roleCode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.salesExecutiveProfileId) {
      setError("Select a Sales Executive profile");
      return;
    }
    const forceVisible = user?.roleCode === "SALES_EXECUTIVE";
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
      const res = await api.createSwot(token, {
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        strengthPoints,
        weaknessPoints,
        opportunityPoints,
        threatPoints,
      });
      router.push(
        returnTo
          ? returnTo
          : form.salesExecutiveProfileId
            ? `/profiles/${form.salesExecutiveProfileId}/swot`
            : `/swot/${res.data.swot.id}`,
      );
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
      <ErrorState message="Super Admin is governance-only and cannot create SWOT analyses. Sign in as Commando, Team Lead, or Sales Executive." />
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
          Update SWOT
        </h1>
        <p className="text-sm text-slate-600">
          Source will be recorded as <strong>{sourceHint}</strong>. Saving
          creates a <strong>new version</strong> — previous SWOT content stays
          available in history.
        </p>
        {showVisibility ? (
          <p className="mt-2 text-sm text-slate-600">
            Add numbered points. Check <strong>Show to SE</strong> only on the
            points the Sales Executive should see. Team Lead and Commando always
            see the full list.
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        {user?.roleCode === "SALES_EXECUTIVE" ? (
          <p className="text-sm text-slate-600">
            Profile: {ownProfileName ?? "Loading…"}
          </p>
        ) : lockedProfileId ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Sales Executive:{" "}
            <span className="font-medium text-[var(--color-ink)]">
              {lockedProfileName ?? "Loading…"}
            </span>
          </p>
        ) : (
          <ProfileSearchSelect
            value={form.salesExecutiveProfileId}
            onChange={(id) =>
              setForm({ ...form, salesExecutiveProfileId: id })
            }
          />
        )}

        <SwotPointsEditor
          label="Strengths"
          showVisibility={showVisibility}
          points={form.strength}
          onChange={(strength) => setForm({ ...form, strength })}
        />
        <SwotPointsEditor
          label="Weaknesses"
          showVisibility={showVisibility}
          points={form.weakness}
          onChange={(weakness) => setForm({ ...form, weakness })}
        />
        <SwotPointsEditor
          label="Opportunities"
          showVisibility={showVisibility}
          points={form.opportunity}
          onChange={(opportunity) => setForm({ ...form, opportunity })}
        />
        <SwotPointsEditor
          label="Threats"
          showVisibility={showVisibility}
          points={form.threat}
          onChange={(threat) => setForm({ ...form, threat })}
        />

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save SWOT"}
        </Button>
      </form>
    </div>
  );
}

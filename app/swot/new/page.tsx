"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, EyeOff, History, UserRound } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName, roleLabel } from "@/lib/labels";
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
  const namedSubject =
    searchParams.get("name")?.trim() ||
    searchParams.get("subjectName")?.trim() ||
    "";
  const returnTo = searchParams.get("returnTo");
  const startBlank = searchParams.get("fresh") === "1";
  // profileId + subjectUserId = SE User SWOT with a known person (e.g. from the
  // intervention packet). subjectUserId alone = SSE.
  const isSseLock = Boolean(lockedSubjectUserId) && !lockedProfileId;

  const isSse = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";
  const isSe = user?.roleCode === "SALES_EXECUTIVE";
  const isManager =
    user?.roleCode === "TEAM_LEAD" || user?.roleCode === "COMMANDO_EXECUTIVE";
  // Only Team Leads and Commandos write Profile SWOT.
  const isProfileSwot =
    searchParams.get("subject") === "profile" &&
    isManager &&
    Boolean(lockedProfileId);

  const [subjectKind, setSubjectKind] = useState<SubjectKind>(
    isSseLock ? "SSE" : "SE",
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
    namedSubject || null,
  );
  const [ownProfileName, setOwnProfileName] = useState<string | null>(null);
  const [pickedProfileName, setPickedProfileName] = useState<string | null>(
    null,
  );
  const [sseSubjects, setSseSubjects] = useState<
    Array<{ id: string; firstName: string; lastName: string; email: string }>
  >([]);
  const [subjectLoadError, setSubjectLoadError] = useState<string | null>(null);
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
        // Keep the user id from the URL when the intervention packet provided it.
        subjectUserId: lockedSubjectUserId || prev.subjectUserId,
      }));
      if (namedSubject) setLockedProfileName(namedSubject);
    }
  }, [lockedProfileId, lockedSubjectUserId, namedSubject]);

  useEffect(() => {
    if (!isSseLock) return;
    setSubjectKind("SSE");
    setForm((prev) => ({
      ...prev,
      subjectUserId: lockedSubjectUserId,
      salesExecutiveProfileId: "",
    }));
    if (namedSubject) setLockedProfileName(namedSubject);
  }, [isSseLock, lockedSubjectUserId, namedSubject]);

  useEffect(() => {
    if (!token || !lockedProfileId) return;
    if (isProfileSwot && namedSubject) return;
    let cancelled = false;
    setSubjectLoadError(null);
    void api
      .getProfile(token, lockedProfileId)
      .then((res) => {
        if (cancelled) return;
        setLockedProfileName(res.data.profile.displayName);
        setForm((prev) => ({
          ...prev,
          salesExecutiveProfileId: lockedProfileId,
          subjectUserId: res.data.profile.user.id,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        // Name / user id from the URL are enough to keep writing; only fail hard
        // when we still cannot resolve who this SWOT is for.
        if (!namedSubject || !lockedSubjectUserId) {
          setSubjectLoadError(
            "Couldn't load this Sales Executive. Go back and try Add one again.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    token,
    lockedProfileId,
    namedSubject,
    lockedSubjectUserId,
    isProfileSwot,
  ]);

  useEffect(() => {
    if (!token || !isManager) return;
    void api
      .getSwotSupportSubjects(token)
      .then((res) => setSseSubjects(res.data.subjects))
      .catch(() => setSseSubjects([]));
  }, [token, isManager]);

  useEffect(() => {
    if (!token || !user || startBlank) return;
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
    if (!source && !isProfileSwot) return;
    void api
      .getSwotList(
        token,
        isProfileSwot
          ? {
              profileId: form.salesExecutiveProfileId,
              subjectType: "PROFILE",
              pageSize: 20,
            }
          : {
              profileId: form.salesExecutiveProfileId,
              subjectType: "EXECUTIVE",
              source: source ?? undefined,
              pageSize: 5,
            },
      )
      .then((res) => {
        const latest = isProfileSwot
          ? res.data.items.find(
              (s) => s.source === "TEAM_LEAD" || s.source === "COMMANDO",
            )
          : res.data.items[0];
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
  }, [
    token,
    form.salesExecutiveProfileId,
    user,
    subjectKind,
    isSse,
    isProfileSwot,
    startBlank,
  ]);

  useEffect(() => {
    if (
      !token ||
      !isManager ||
      startBlank ||
      subjectKind !== "SSE" ||
      !form.subjectUserId
    ) {
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
  }, [token, form.subjectUserId, user, subjectKind, isManager, startBlank]);

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
    if (!token || !isSse || startBlank) return;
    void api
      .getSwotList(token, {
        source: "SALES_SUPPORT_EXECUTIVE",
        subjectType: "EXECUTIVE",
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
  }, [token, isSse, startBlank]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (isProfileSwot && !form.salesExecutiveProfileId) {
      setError("Could not resolve the Sales Executive profile");
      return;
    }
    if (!isProfileSwot && isManager && subjectKind === "SE" && !form.subjectUserId) {
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
      const body = isProfileSwot
          ? {
              subjectType: "PROFILE" as const,
              salesExecutiveProfileId: form.salesExecutiveProfileId,
              strengthPoints,
              weaknessPoints,
              opportunityPoints,
              threatPoints,
            }
        : isSse || (isManager && subjectKind === "SSE")
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
          : isManager && subjectKind === "SE"
            ? {
                subjectType: "EXECUTIVE" as const,
                executiveUserId: form.subjectUserId,
                subjectUserId: form.subjectUserId,
                strengthPoints,
                weaknessPoints,
                opportunityPoints,
                threatPoints,
              }
            : {
                subjectType: "EXECUTIVE" as const,
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

  const sourceLabel = roleLabel(user?.roleCode ?? "");
  const isSelf = isSe || isSse;

  const backHref =
    returnTo ||
    (form.salesExecutiveProfileId && !isSse
      ? `/profiles/${form.salesExecutiveProfileId}`
      : "/swot");
  const sseSubject =
    subjectKind === "SSE"
      ? sseSubjects.find(
          (s) => s.id === (lockedSubjectUserId || form.subjectUserId),
        )
      : undefined;
  const subjectFullName = isProfileSwot
    ? (lockedProfileName ?? namedSubject)
    : isSse
    ? personName(user!)
    : isSe
      ? (ownProfileName ?? "")
      : subjectKind === "SSE"
        ? sseSubject
          ? personName(sseSubject)
          : (lockedProfileName ?? namedSubject)
        : (lockedProfileName ?? pickedProfileName ?? namedSubject);
  const subjectFirstName = subjectFullName.split(/\s+/)[0] ?? "";
  const subjectRoleLabel =
    isSse || subjectKind === "SSE" ? "Sales Support" : "Sales Executive";
  const subjectLocked = Boolean(
    isSelf || lockedProfileId || lockedSubjectUserId,
  );
  const subjectPending =
    subjectLocked && !subjectFullName && !subjectLoadError;

  const allPoints = [
    ...form.strength,
    ...form.weakness,
    ...form.opportunity,
    ...form.threat,
  ].filter((p) => p.text.trim());
  const sharedCount = allPoints.filter((p) => p.visible).length;

  const hints = isProfileSwot
    ? {
        strength: "What this profile/account already has going for it",
        weakness: "Gaps in the profile — pipeline, territory, accounts",
        opportunity: "Openings the intervention can use",
        threat: "External risks to the profile's results",
      }
    : isSelf
    ? {
        strength: "What you consistently do well",
        weakness: "Areas where you'd like to improve",
        opportunity: "Chances to grow or perform better",
        threat: "Risks that could hold you back",
      }
    : {
        strength: "What they consistently do well",
        weakness: "Areas where they need support to improve",
        opportunity: "Chances for them to grow or perform better",
        threat: "Risks that could hold them back",
      };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <ArrowLeft size={15} aria-hidden />
          Back
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
              SWOT analysis
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {`${startBlank ? "New" : "Update"} ${
                isProfileSwot
                  ? "Profile SWOT"
                  : isSelf
                    ? "my SWOT"
                    : "User SWOT"
              }`}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-ink-muted)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1">
              <UserRound size={13} aria-hidden />
              Recorded as{" "}
              <strong className="font-semibold text-[var(--color-ink)]">
                {sourceLabel}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1">
              <History size={13} aria-hidden />
              Saves as a new version
            </span>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-[var(--color-ink-muted)]">
          {startBlank
            ? "This starts from an empty SWOT. Saving makes it the current version; the previous one stays in history."
            : "Each save creates a new version, so earlier SWOT content always remains available in history."}
          {showVisibility
            ? isProfileSwot
              ? ` Points stay private to you and your team until you choose to share them with ${subjectFirstName || "the Sales Executive"} and their Sales Support.`
              : ` Points stay private to you and your team until you choose to share them${subjectFirstName ? ` with ${subjectFirstName}` : ""}.`
            : ""}
        </p>
        {isProfileSwot ? (
          <div className="profile-swot-note">
            <EyeOff size={16} strokeWidth={2} aria-hidden />
            <div>
              <p className="profile-swot-note-title">Shared point by point</p>
              <p className="profile-swot-note-body">
                This <strong>Profile SWOT</strong> describes the profile/account
                under intervention and never changes the{" "}
                <strong>User SWOT</strong>. The Sales Executive and their Sales
                Support only see the points you share.
              </p>
            </div>
          </div>
        ) : null}
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
          {subjectLocked ? (
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-sm font-semibold text-[var(--color-ink)]"
                aria-hidden
              >
                {initials(subjectFullName) || "—"}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
                  {isProfileSwot
                    ? "Profile SWOT · Sales Executive profile"
                    : isSelf
                      ? "Your SWOT"
                      : subjectRoleLabel}
                </p>
                <p className="truncate text-base font-semibold text-[var(--color-ink)]">
                  {subjectFullName ||
                    (subjectPending
                      ? "Loading…"
                      : subjectLoadError
                        ? "Unknown subject"
                        : "—")}
                </p>
                {subjectLoadError ? (
                  <p className="mt-0.5 text-xs text-[var(--status-danger)]">
                    {subjectLoadError}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                role="radiogroup"
                aria-label="SWOT for"
                className="inline-flex rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-0.5"
              >
                {(
                  [
                    ["SE", "Sales Executive"],
                    ["SSE", "Sales Support"],
                  ] as const
                ).map(([kind, text]) => (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={subjectKind === kind}
                    onClick={() => {
                      setSubjectKind(kind);
                      setPickedProfileName(null);
                      setForm((p) =>
                        kind === "SE"
                          ? { ...p, subjectUserId: "" }
                          : { ...p, salesExecutiveProfileId: "" },
                      );
                    }}
                    className={`rounded-[6px] px-3 py-1.5 text-sm font-medium transition ${
                      subjectKind === kind
                        ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-sm)]"
                        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
              {subjectKind === "SE" ? (
                <ProfileSearchSelect
                  label="Sales Executive"
                  value={form.salesExecutiveProfileId}
                  onChange={(id, profile) => {
                    setPickedProfileName(profile?.displayName ?? null);
                    setForm((prev) => ({
                      ...prev,
                      salesExecutiveProfileId: id,
                      subjectUserId: profile?.user.id ?? "",
                    }));
                  }}
                />
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
              )}
            </div>
          )}
        </section>

        <div className="swot-form-grid">
          <SwotPointsEditor
            label="Strengths"
            tone="strength"
            hint={hints.strength}
            points={form.strength}
            onChange={(strength) => setForm((prev) => ({ ...prev, strength }))}
            showVisibility={showVisibility}
            subjectName={subjectFirstName}
          />
          <SwotPointsEditor
            label="Weaknesses"
            tone="weakness"
            hint={hints.weakness}
            points={form.weakness}
            onChange={(weakness) => setForm((prev) => ({ ...prev, weakness }))}
            showVisibility={showVisibility}
            subjectName={subjectFirstName}
          />
          <SwotPointsEditor
            label="Opportunities"
            tone="opportunity"
            hint={hints.opportunity}
            points={form.opportunity}
            onChange={(opportunity) =>
              setForm((prev) => ({ ...prev, opportunity }))
            }
            showVisibility={showVisibility}
            subjectName={subjectFirstName}
          />
          <SwotPointsEditor
            label="Threats"
            tone="threat"
            hint={hints.threat}
            points={form.threat}
            onChange={(threat) => setForm((prev) => ({ ...prev, threat }))}
            showVisibility={showVisibility}
            subjectName={subjectFirstName}
          />
        </div>

        {error ? <ErrorState message={error} /> : null}

        <div className="swot-form-footer">
          <p className="text-[13px] text-[var(--color-ink-muted)]">
            <span className="font-semibold tabular-nums text-[var(--color-ink)]">
              {allPoints.length}
            </span>{" "}
            {allPoints.length === 1 ? "point" : "points"}
            {showVisibility ? (
              <>
                <span className="mx-1.5 text-[var(--color-ink-subtle)]">·</span>
                <span className="tabular-nums">{sharedCount}</span> shared
                {subjectFirstName ? ` with ${subjectFirstName}` : ""}
              </>
            ) : null}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => router.push(backHref)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : isProfileSwot
                  ? "Save Profile SWOT"
                  : "Save SWOT"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

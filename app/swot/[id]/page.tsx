"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorMessage, type SwotItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePreviousPath } from "@/lib/nav-history";
import { toast } from "@/lib/toast";
import { personName, roleLabel } from "@/lib/labels";
import { EyeOff } from "lucide-react";
import {
  SwotCorrectionNote,
  SwotCorrectionNotice,
  type SwotCorrectionRequest,
} from "@/components/swot/SwotPointCorrection";
import {
  isSelfSwotSource,
  safeReturnTo,
  swotKindLabel,
  swotSourceLabel,
  swotSubjectName,
  swotSubjectRoleLabel,
} from "@/lib/swot-display";
import {
  ProfileSwotBadge,
  UserSwotBadge,
} from "@/components/swot/InterventionSwotPair";
import { StatusBadge } from "@/components/StatusBadge";
import {
  SwotQuadrantBoard,
  type SwotQuadrantKey,
  SWOT_QUADRANTS,
} from "@/components/swot/SwotQuadrantBoard";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function SwotDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const previousPath = usePreviousPath();
  const returnTo =
    safeReturnTo(searchParams.get("returnTo")) ??
    (previousPath && previousPath !== "/login" && !previousPath.startsWith("/swot/")
      ? previousPath
      : null);
  const { token, user, hasPermission } = useAuth();
  const [swot, setSwot] = useState<SwotItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyFlag, setBusyFlag] = useState<SwotQuadrantKey | "all" | string | null>(
    null,
  );
  const [correcting, setCorrecting] = useState(false);
  const isSuperAdmin = user?.roleCode === "SUPER_ADMIN";
  const canCorrect = isSuperAdmin && swot?.isCurrentVersion === true;

  const isProfileSwot = swot?.subjectType === "PROFILE";
  const audience = isProfileSwot
    ? "the Sales Executive and Sales Support"
    : "the subject executive";
  const canToggleVisibility =
    Boolean(user) &&
    hasPermission("SWOT_CREATE") &&
    Boolean(swot) &&
    ((user!.roleCode === "TEAM_LEAD" && swot!.source === "TEAM_LEAD") ||
      (user!.roleCode === "COMMANDO_EXECUTIVE" && swot!.source === "COMMANDO"));

  const isSubjectExecutive =
    user?.roleCode === "SALES_EXECUTIVE" ||
    user?.roleCode === "SALES_SUPPORT_EXECUTIVE";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getSwot(token, params.id);
        if (!cancelled) {
          setSwot(res.data.swot);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load this SWOT.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  async function patchVisibility(
    body: Parameters<typeof api.setSwotVisibility>[2],
    flag: SwotQuadrantKey | "all" | string,
    okMessage: string,
  ) {
    if (!token || !swot || !canToggleVisibility) return;
    setBusyFlag(flag);
    try {
      const res = await api.setSwotVisibility(token, swot.id, body);
      setSwot(res.data.swot);
      toast.success(okMessage);
    } catch (err) {
      toast.error(errorMessage(err, "Unable to update sharing"));
    } finally {
      setBusyFlag(null);
    }
  }

  async function correctPoint(request: SwotCorrectionRequest): Promise<boolean> {
    if (!token || !swot || !canCorrect) return false;
    setCorrecting(true);
    try {
      const res =
        request.kind === "add"
          ? await api.addSwotPoint(token, swot.id, {
              quadrant: request.quadrant,
              text: request.text,
              reason: request.reason,
            })
          : request.kind === "edit"
            ? await api.updateSwotPoint(token, swot.id, request.pointId, {
                text: request.text,
                reason: request.reason,
              })
            : await api.deleteSwotPoint(token, swot.id, request.pointId, {
                reason: request.reason,
              });
      setSwot(res.data.swot);
      toast.success(
        request.kind === "add"
          ? "Point added"
          : request.kind === "edit"
            ? "Point updated"
            : "Point deleted",
      );
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Unable to save the correction"));
      return false;
    } finally {
      setCorrecting(false);
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!swot) return <LoadingState label="Loading SWOT…" />;

  const selfVersion = isSelfSwotSource(swot.source);
  const subjectName = swotSubjectName(swot);
  const subjectRole = swotSubjectRoleLabel(swot);
  const sourceLabel =
    swot.source === "TEAM_LEAD"
      ? "Team Lead assessment"
      : swot.source === "COMMANDO"
        ? "Commando assessment"
        : swot.source === "SALES_SUPPORT_EXECUTIVE"
          ? "Sales Support self-assessment"
          : "Sales Executive self-assessment";

  const subjectProfileId = swot.salesExecutiveProfileId ?? swot.profile?.id ?? null;
  const subjectSupportUserId =
    subjectRole === "Sales Support Executive"
      ? (swot.executiveUserId ?? swot.subjectUserId ?? null)
      : null;
  const backHref =
    returnTo ??
    (subjectProfileId
      ? `/profiles/${subjectProfileId}/swot`
      : subjectSupportUserId
        ? `/support/${subjectSupportUserId}/swot`
        : "/swot");
  const backLabel = !returnTo
    ? backHref === "/swot"
      ? "← Back to SWOT"
      : `← Back to ${subjectName}'s SWOT`
    : returnTo.startsWith("/dashboard")
      ? "← Back to dashboard"
      : returnTo.startsWith("/reports")
        ? "← Back to report"
        : returnTo.startsWith("/profiles/") || returnTo.startsWith("/support/")
          ? `← Back to ${subjectName}`
          : "← Back to SWOT";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${swotKindLabel(swot)} · ${subjectName}`}
        description={`${subjectRole}${swot.team?.name ? ` · ${swot.team.name}` : ""} · ${sourceLabel}${
          swot.versionNumber ? ` · Version ${swot.versionNumber}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isProfileSwot ? <ProfileSwotBadge /> : <UserSwotBadge />}
            <StatusBadge
              status={swot.source}
              label={swotSourceLabel(swot.source)}
            />
          </div>
        }
      />
      <p className="text-sm text-[var(--color-ink-muted)]">
        Authored by {personName(swot.createdBy)} (
        {roleLabel(swot.createdBy.role.code)}) ·{" "}
        <DateTimeCell value={swot.createdAt} />
      </p>
      <SwotCorrectionNote swot={swot} />
      {isSuperAdmin ? <SwotCorrectionNotice canCorrect={canCorrect} /> : null}
      {isSuperAdmin ? null : isProfileSwot && !(isSubjectExecutive && !selfVersion) ? (
        <div className="profile-swot-note">
          <EyeOff size={16} strokeWidth={2} aria-hidden />
          <div>
            <p className="profile-swot-note-title">
              {selfVersion ? "Self-submitted Profile SWOT" : "Shared point by point"}
            </p>
            <p className="profile-swot-note-body">
              {selfVersion
                ? "This version is read-only. Only its author, the Team Lead and Commando see it."
                : "This version is read-only. The Profile SWOT describes the profile/account under intervention and is separate from the User SWOT. Team Lead and Commando always see every point; the Sales Executive and their Sales Support only see checked points."}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-ink-muted)]">
          This version is read-only. Updating SWOT creates a new version and
          keeps this one in history. Team Lead and Commando can always see every
          point. The subject executive only sees checked points.
        </p>
      )}

      <SwotQuadrantBoard
        swot={swot}
        canShare={canToggleVisibility}
        isSe={isSubjectExecutive}
        isProfile={isProfileSwot}
        busyFlag={busyFlag}
        onCorrect={canCorrect ? correctPoint : undefined}
        correctionBusy={correcting}
        showShareSummary={!isSuperAdmin}
        onTogglePoint={(quadrant, pointId, next) => {
          const q = SWOT_QUADRANTS.find((item) => item.key === quadrant);
          void patchVisibility(
            { point: { quadrant, id: pointId, visible: next } },
            pointId,
            next
              ? `${q?.title ?? "Point"} shared with ${audience}`
              : `${q?.title ?? "Point"} held back from ${audience}`,
          );
        }}
        onShareAll={(share) => {
          void patchVisibility(
            { visibleToSalesExecutive: share },
            "all",
            share
              ? `All points shared with ${audience}`
              : `SWOT held back from ${audience}`,
          );
        }}
      />

      <p>
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          {backLabel}
        </Link>
      </p>
    </div>
  );
}

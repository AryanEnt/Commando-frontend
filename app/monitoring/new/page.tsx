"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type ProfileListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { MonitoringSessionForm } from "@/components/monitoring/MonitoringSessionForm";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  ErrorState,
  LoadingState,
  Skeleton,
} from "@/components/ui";

export default function NewMonitoringPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewMonitoringContent />
    </Suspense>
  );
}

function NewMonitoringContent() {
  const { token, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedProfileId = searchParams.get("profileId") ?? "";
  const [profileId, setProfileId] = useState(lockedProfileId);
  const [profile, setProfile] = useState<ProfileListItem | null>(null);
  const [profileLoading, setProfileLoading] = useState(Boolean(lockedProfileId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lockedProfileId) setProfileId(lockedProfileId);
  }, [lockedProfileId]);

  useEffect(() => {
    if (!token || !profileId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    void api
      .getProfile(token, profileId)
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data.profile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, profileId]);

  if (!hasPermission("MONITORING_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create monitoring sessions." />
    );
  }

  const backHref = profileId
    ? `/profiles/${profileId}/monitoring`
    : "/monitoring";
  const displayName = profile?.displayName ?? "Sales Executive";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-4">
        <nav className="text-xs text-[var(--color-ink-muted)]">
          <Link href="/profiles" className="hover:text-[var(--color-ink)]">
            Sales Executives
          </Link>
          {profileId ? (
            <>
              <span className="mx-1.5">/</span>
              <Link
                href={`/profiles/${profileId}`}
                className="hover:text-[var(--color-ink)]"
              >
                {displayName}
              </Link>
              <span className="mx-1.5">/</span>
              <Link
                href={`/profiles/${profileId}/monitoring`}
                className="hover:text-[var(--color-ink)]"
              >
                Monitoring
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-[var(--color-ink)]">New Session</span>
            </>
          ) : (
            <>
              <span className="mx-1.5">/</span>
              <Link href="/monitoring" className="hover:text-[var(--color-ink)]">
                Monitoring
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-[var(--color-ink)]">New Session</span>
            </>
          )}
        </nav>

        <Link
          href={backHref}
          className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          {profileId ? `← Back to ${displayName}` : "← Monitoring"}
        </Link>

        {profileLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : profile ? (
          <div className="flex items-start gap-3">
            <Avatar name={profile.displayName} size="lg" />
            <div>
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-[var(--color-ink)]">
                New Monitoring Session
              </h1>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {profile.displayName}
                {" · "}
                Sales Executive
                {profile.team?.name ? ` · ${profile.team.name}` : ""}
              </p>
              {profile.currentAssignment ? (
                <div className="mt-2">
                  <StatusBadge status={profile.currentAssignment.status} />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-[1.75rem] font-semibold tracking-tight text-[var(--color-ink)]">
              New Monitoring Session
            </h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Record observations and performance against the selected
              checklist.
            </p>
          </div>
        )}
      </div>

      {!lockedProfileId ? (
        <div className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <ProfileSearchSelect value={profileId} onChange={setProfileId} />
        </div>
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {profileId && profile ? (
        <MonitoringSessionForm
          profileId={profileId}
          profileName={profile.displayName}
          submitting={submitting}
          setSubmitting={setSubmitting}
          setError={setError}
          onSuccess={(recordId) => {
            // Form already toasts; navigate without a second toast.
            router.push(`/monitoring/${recordId}`);
          }}
        />
      ) : profileId && profileLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !profileId ? (
        <div className="rounded border border-dashed border-[var(--color-line-strong)] px-4 py-10 text-center">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            Select a Sales Executive
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
            Choose who this monitoring session is for before loading the
            checklist.
          </p>
        </div>
      ) : (
        <ErrorState message="Unable to load Sales Executive profile." />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, errorMessage, type ProfileDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { personName } from "@/lib/labels";
import { Avatar, ErrorState, LoadingState } from "@/components/ui";

type Props = {
  title: string;
  description: string;
  permission: string;
  returnHref: (profileId: string) => string;
  returnLabel?: string;
  /** Success toast text; `false` when callers show their own. */
  successToast?: string | false;
  children: (ctx: {
    profile: ProfileDetail;
    profileId: string;
    submitting: boolean;
    setSubmitting: (v: boolean) => void;
    setError: (v: string | null) => void;
    onSuccess: (href: string) => void;
  }) => ReactNode;
};

/**
 * Shared shell for create forms nested under /profiles/[id]/…
 * Locks the Sales Executive from the route — no second selection.
 */
export function SeContextualCreatePage({
  title,
  description,
  permission,
  returnHref,
  returnLabel,
  successToast = "Saved",
  children,
}: Props) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user, hasPermission } = useAuth();
  const profileId = params.id;
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !profileId) return;
    setLoading(true);
    api
      .getProfile(token, profileId)
      .then((res) => {
        setProfile(res.data.profile);
        setError(null);
      })
      .catch((err) =>
        setError(errorMessage(err, "Unable to load profile")),
      )
      .finally(() => setLoading(false));
  }, [token, profileId]);

  if (user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Super Admin is read-only for Sales Executive operational records. Commando or Team Lead add this data." />
    );
  }

  if (!hasPermission(permission)) {
    return (
      <ErrorState message="You do not have permission to perform this action." />
    );
  }
  if (loading) return <LoadingState label="Loading…" />;
  if (error && !profile) return <ErrorState message={error} />;
  if (!profile || !profileId) {
    return <ErrorState message="Sales Executive not found." />;
  }

  const back = returnHref(profileId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={back}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← {returnLabel ?? `Back to ${profile.displayName}`}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3 border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3">
        <Avatar name={profile.displayName} size="md" />
        <div>
          <p className="text-sm font-semibold">{profile.displayName}</p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Sales Executive · {profile.team.name}
            {profile.currentAssignment
              ? ` · Commando ${personName(profile.currentAssignment.commando)}`
              : ""}
          </p>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {children({
        profile,
        profileId,
        submitting,
        setSubmitting,
        setError,
        onSuccess: (href) => {
          if (successToast) toast.success(successToast);
          router.push(href);
        },
      })}
    </div>
  );
}

/** Failures render inline in the page's error slot, so no toast is raised as well. */
export function handleApiSubmit(
  err: unknown,
  setError: (v: string | null) => void,
  fallback = "Unable to save changes",
) {
  setError(errorMessage(err, fallback));
}

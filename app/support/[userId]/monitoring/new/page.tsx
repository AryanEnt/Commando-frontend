"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName } from "@/lib/labels";
import { sseWorkspaceHref } from "@/lib/sse-workspace-nav";
import { MonitoringSessionForm } from "@/components/monitoring/MonitoringSessionForm";
import {
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function SupportMonitoringNewPage() {
  const params = useParams<{ userId: string }>();
  const { token, user, hasPermission } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = params.userId;
  const returnHref = sseWorkspaceHref(userId, "monitoring");

  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [linksRes, eligibleRes] = await Promise.all([
          api.getSalesSupportLinks(token, {
            salesSupportUserId: userId,
            isActive: true,
            pageSize: 1,
          }),
          api.getEligibleSupportUsers(token).catch(() => null),
        ]);
        if (cancelled) return;
        const eligible =
          eligibleRes?.data.users.find((u) => u.id === userId) ?? null;
        const fromLink = linksRes.data.links[0]?.supportUser ?? null;
        const person = eligible ?? fromLink;
        if (!person) {
          setLoadError("This Sales Support was not found in your team scope.");
          return;
        }
        setDisplayName(personName(person));
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Unable to load Sales Support workspace.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  if (user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Super Admin is read-only for operational records." />
    );
  }
  if (!hasPermission("MONITORING_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create monitoring sessions." />
    );
  }
  if (!token || !userId) {
    return <LoadingState label="Loading…" />;
  }
  if (loadError) {
    return <ErrorState message={loadError} />;
  }
  if (!displayName) {
    return <LoadingState label="Loading…" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Sales Support"
        title="New Monitoring Session"
        description={`Record observations against the checklist for ${displayName}.`}
      />
      {error ? <ErrorState message={error} /> : null}
      <MonitoringSessionForm
        executiveUserId={userId}
        profileName={displayName}
        submitting={submitting}
        setSubmitting={setSubmitting}
        setError={setError}
        activeSupport={[]}
        onSuccess={() => {
          router.push(returnHref);
        }}
      />
    </div>
  );
}

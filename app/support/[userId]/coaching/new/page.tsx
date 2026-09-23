"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { sseDailyLogHref } from "@/lib/sse-workspace-nav";
import { ErrorState, LoadingState } from "@/components/ui";

/** Opens/continues today's Daily Log for a Sales Support subject. */
export default function SupportCoachingNewPage() {
  const params = useParams<{ userId: string }>();
  const { token, user, hasPermission } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !params.userId) return;
    if (user?.roleCode === "SUPER_ADMIN") {
      setError("Super Admin is read-only for operational records.");
      return;
    }
    if (!hasPermission("DAILY_LOG_CREATE")) {
      setError("You do not have permission to create daily logs.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.ensureDailyLog(token, {
          executiveUserId: params.userId,
        });
        if (cancelled) return;
        router.replace(sseDailyLogHref(params.userId, res.data.log.id));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to open Daily Log",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.userId, user?.roleCode, hasPermission, router]);

  if (error) return <ErrorState message={error} />;
  return <LoadingState label="Opening today's journal…" />;
}

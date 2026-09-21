"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { seDailyLogHref } from "@/lib/se-workspace-nav";
import { ErrorState, LoadingState } from "@/components/ui";

/**
 * Opens/continues today's Daily Log inside the SE workspace (sidebar stays).
 */
export default function ContextualCoachingNewPage() {
  const params = useParams<{ id: string }>();
  const { token, user, hasPermission } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !params.id) return;
    if (user?.roleCode === "SUPER_ADMIN") {
      setError(
        "Super Admin is read-only for Sales Executive operational records.",
      );
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
          salesExecutiveProfileId: params.id,
        });
        if (cancelled) return;
        router.replace(seDailyLogHref(params.id, res.data.log.id));
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
  }, [token, params.id, user?.roleCode, hasPermission, router]);

  if (error) return <ErrorState message={error} />;
  return <LoadingState label="Opening today's journal…" />;
}

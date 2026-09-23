"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { seDailyLogHref } from "@/lib/se-workspace-nav";
import { ErrorState, LoadingState } from "@/components/ui";

/**
 * Legacy /daily-logs/:id → redirect into SE workspace so sidebar remains.
 */
export default function DailyLogDetailRedirectPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening Daily Log…" />}>
      <RedirectInner />
    </Suspense>
  );
}

function RedirectInner() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !params.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getDailyLog(token, params.id);
        if (cancelled) return;
        router.replace(
          res.data.log.salesExecutiveProfileId
            ? seDailyLogHref(
                res.data.log.salesExecutiveProfileId,
                res.data.log.id,
              )
            : res.data.log.executiveUserId
              ? `/support/${res.data.log.executiveUserId}/daily-logs/${res.data.log.id}`
              : `/daily-logs/${res.data.log.id}`,
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to open");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id, router]);

  if (error) return <ErrorState message={error} />;
  return <LoadingState label="Opening in Sales Executive workspace…" />;
}

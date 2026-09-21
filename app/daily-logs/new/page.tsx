"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { seDailyLogHref } from "@/lib/se-workspace-nav";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { Button, ErrorState, LoadingState } from "@/components/ui";

export default function NewDailyLogPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening Daily Log…" />}>
      <NewDailyLogInner />
    </Suspense>
  );
}

function NewDailyLogInner() {
  const { token, user, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselected = searchParams.get("profileId") ?? "";
  const [profileId, setProfileId] = useState(preselected);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preselected) setProfileId(preselected);
  }, [preselected]);

  // Auto-open when profile is preselected
  useEffect(() => {
    if (!token || !preselected || !hasPermission("DAILY_LOG_CREATE")) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        const res = await api.ensureDailyLog(token, {
          salesExecutiveProfileId: preselected,
        });
        if (!cancelled) {
          router.replace(seDailyLogHref(preselected, res.data.log.id));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to open");
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, preselected, hasPermission, router]);

  async function openLog() {
    if (!token || !profileId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.ensureDailyLog(token, {
        salesExecutiveProfileId: profileId,
      });
      router.push(seDailyLogHref(profileId, res.data.log.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to open");
      setBusy(false);
    }
  }

  if (user?.roleCode === "SUPER_ADMIN") {
    return (
      <ErrorState message="Super Admin is read-only for daily logs." />
    );
  }
  if (!hasPermission("DAILY_LOG_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create daily logs." />
    );
  }

  if (preselected && !error) {
    return <LoadingState label="Opening today's Daily Log…" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/daily-logs" className="text-sm text-slate-600 underline">
          ← Daily Logs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Daily Log
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          One log per Sales Executive per day. If today&apos;s draft already
          exists, you&apos;ll continue it.
        </p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      <div className="space-y-4 rounded border border-slate-200 bg-white p-4">
        <ProfileSearchSelect
          value={profileId}
          onChange={(id) => setProfileId(id)}
        />
        <Button
          type="button"
          disabled={!profileId || busy}
          onClick={() => void openLog()}
        >
          {busy ? "Opening…" : "Continue today's log"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui";

export default function NewEisenhowerTaskPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening Daily Log…" />}>
      <RedirectToDailyLog />
    </Suspense>
  );
}

/**
 * Eisenhower priorities are created from Daily Logs (urgency + importance).
 * Keep this route as a redirect for old bookmarks / links.
 */
function RedirectToDailyLog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");

  useEffect(() => {
    if (profileId) {
      router.replace(`/profiles/${profileId}/coaching/new`);
      return;
    }
    router.replace("/daily-logs/new");
  }, [profileId, router]);

  return <LoadingState label="Opening Daily Log…" />;
}

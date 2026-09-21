"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui";
import { mondayOfWeek, parseYmd, toYmd } from "@/lib/week";

/**
 * Legacy create route — writing happens in the Weekly Review workspace.
 * Keep this path for bookmarks/links; redirect into the two-pane hub.
 */
export default function ContextualReviewNewPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening weekly review…" />}>
      <RedirectToHub />
    </Suspense>
  );
}

function RedirectToHub() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    const raw = searchParams.get("weekStart");
    const weekStart = raw
      ? toYmd(mondayOfWeek(parseYmd(raw)))
      : null;
    const qs = weekStart ? `?weekStart=${weekStart}` : "";
    router.replace(`/profiles/${id}/reviews${qs}`);
  }, [params.id, router, searchParams]);

  return <LoadingState label="Opening weekly review…" />;
}

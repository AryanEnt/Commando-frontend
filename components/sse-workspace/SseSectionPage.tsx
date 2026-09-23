"use client";

import { Suspense } from "react";
import { SseWorkspaceContent } from "@/components/sse-workspace/SseWorkspaceContent";
import { LoadingState } from "@/components/ui";

export function SseSectionPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <SseWorkspaceContent />
    </Suspense>
  );
}

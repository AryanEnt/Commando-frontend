"use client";

import { Suspense } from "react";
import { SeWorkspaceContent } from "@/components/se-workspace/SeWorkspaceContent";
import { LoadingState } from "@/components/ui";

export function SeSectionPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <SeWorkspaceContent />
    </Suspense>
  );
}

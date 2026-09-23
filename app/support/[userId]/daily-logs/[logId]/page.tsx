"use client";

import { useParams } from "next/navigation";
import { DailyLogWorkspace } from "@/components/daily-logs/DailyLogWorkspace";
import { sseWorkspaceHref } from "@/lib/sse-workspace-nav";

export default function SupportDailyLogPage() {
  const params = useParams<{ userId: string; logId: string }>();
  return (
    <DailyLogWorkspace
      logId={params.logId}
      backHref={sseWorkspaceHref(params.userId, "coaching")}
    />
  );
}

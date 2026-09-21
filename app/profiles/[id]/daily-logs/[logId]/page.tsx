"use client";

import { useParams } from "next/navigation";
import { DailyLogWorkspace } from "@/components/daily-logs/DailyLogWorkspace";
import { seWorkspaceHref } from "@/lib/se-workspace-nav";

/**
 * Daily Log journal — stays inside SeWorkspaceShell so SE context sidebar persists.
 */
export default function ProfileDailyLogPage() {
  const params = useParams<{ id: string; logId: string }>();
  return (
    <DailyLogWorkspace
      logId={params.logId}
      profileId={params.id}
      backHref={seWorkspaceHref(params.id, "coaching")}
    />
  );
}

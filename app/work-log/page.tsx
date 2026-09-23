"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DailyWorkLogPanel } from "@/components/daily-work-logs/DailyWorkLogPanel";
import { useAuth } from "@/lib/auth-context";
import { ErrorState, LoadingState } from "@/components/ui";

function WorkLogContent() {
  const { user, hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const authorUserId = searchParams.get("authorUserId");
  const authorName = searchParams.get("name");

  if (!hasPermission("DAILY_WORK_LOG_VIEW")) {
    return (
      <ErrorState message="You do not have permission to view daily work logs." />
    );
  }

  const isSelf =
    !authorUserId || (user?.id != null && authorUserId === user.id);
  const canAuthor =
    isSelf &&
    (user?.roleCode === "SALES_SUPPORT_EXECUTIVE" ||
      user?.roleCode === "SALES_EXECUTIVE");

  return (
    <div className="w-full px-1 pb-6 pt-1 sm:px-0">
      <DailyWorkLogPanel
        authorUserId={authorUserId ?? user?.id}
        mode={canAuthor ? "author" : "review"}
        showAuthor={!isSelf}
        title={isSelf ? "Daily Work Log" : authorName ?? "Work logs"}
      />
    </div>
  );
}

export default function WorkLogPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <WorkLogContent />
    </Suspense>
  );
}

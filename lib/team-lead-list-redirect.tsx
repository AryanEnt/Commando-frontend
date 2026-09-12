"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "@/components/ui";

/**
 * Team Lead works these records from the Sales Executive workspace,
 * not from global list pages. Redirect bookmarks / stale links.
 */
export function useTeamLeadListRedirect(
  listPath:
    | "/weekly-reviews"
    | "/action-items"
    | "/feedback"
    | "/performance",
) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const shouldRedirect = !loading && user?.roleCode === "TEAM_LEAD";

  useEffect(() => {
    if (!shouldRedirect) return;
    router.replace("/profiles");
  }, [shouldRedirect, router, listPath]);

  return shouldRedirect;
}

export function TeamLeadListRedirectGate({
  listPath,
  children,
}: {
  listPath:
    | "/weekly-reviews"
    | "/action-items"
    | "/feedback"
    | "/performance";
  children: ReactNode;
}) {
  const redirecting = useTeamLeadListRedirect(listPath);
  if (redirecting) {
    return <LoadingState label="Opening Sales Executives…" />;
  }
  return children;
}

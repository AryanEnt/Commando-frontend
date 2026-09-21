"use client";

import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/labels";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { SuperAdminControlTower } from "@/components/control-tower/SuperAdminControlTower";
import { CommandoDashboard } from "@/components/dashboard/CommandoDashboard";
import { SalesSupportDashboard } from "@/components/dashboard/SalesSupportDashboard";
import { TeamLeadDashboard } from "@/components/dashboard/TeamLeadDashboard";

function SalesExecutiveHome() {
  // AppShell redirects Sales Executives to `/profiles/{ownId}` (My Workspace).
  return <LoadingState label="Opening your workspace…" />;
}

function SuperAdminDashboard({ token }: { token: string }) {
  return <SuperAdminControlTower token={token} />;
}

export default function DashboardPage() {
  const { token, user, hasPermission } = useAuth();

  if (!hasPermission("DASHBOARD_VIEW")) {
    return (
      <ErrorState message="You don't have permission to view the dashboard." />
    );
  }

  if (!token || !user) {
    return <LoadingState />;
  }

  const props = {
    token,
    firstName: user.firstName,
    roleCode: user.roleCode,
  };

  switch (user.roleCode) {
    case "TEAM_LEAD":
      return <TeamLeadDashboard {...props} />;
    case "COMMANDO_EXECUTIVE":
      return <CommandoDashboard {...props} />;
    case "SALES_EXECUTIVE":
      return <SalesExecutiveHome />;
    case "SALES_SUPPORT_EXECUTIVE":
      return <SalesSupportDashboard {...props} />;
    case "SUPER_ADMIN":
      return <SuperAdminDashboard token={token} />;
    default:
      return (
        <EmptyState
          title="No dashboard for this role"
          description={`Role ${roleLabel(user.roleCode)} does not have a configured home dashboard.`}
        />
      );
  }
}

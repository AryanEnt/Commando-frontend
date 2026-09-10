export type RoleCode =
  | "SUPER_ADMIN"
  | "TEAM_LEAD"
  | "COMMANDO_EXECUTIVE"
  | "SALES_EXECUTIVE"
  | "SALES_SUPPORT_EXECUTIVE";

export type NavItem = {
  href: string;
  label: string;
  permission: string;
  section?: string;
};

export const ROLE_NAV: Record<RoleCode, NavItem[]> = {
  TEAM_LEAD: [
    { href: "/dashboard", label: "Dashboard", permission: "DASHBOARD_VIEW", section: "Workspace" },
    { href: "/profiles", label: "Sales Executives", permission: "PROFILE_VIEW", section: "People" },
    { href: "/referrals", label: "Interventions", permission: "REFERRAL_VIEW", section: "Work" },
  ],

  COMMANDO_EXECUTIVE: [
    { href: "/dashboard", label: "Dashboard", permission: "DASHBOARD_VIEW", section: "Workspace" },
    { href: "/profiles", label: "Sales Executives", permission: "PROFILE_VIEW", section: "People" },
    { href: "/referrals", label: "Interventions", permission: "REFERRAL_VIEW", section: "Work" },
    { href: "/assignments", label: "History", permission: "ASSIGNMENT_VIEW", section: "Work" },
  ],

  SALES_EXECUTIVE: [
    { href: "/dashboard", label: "Dashboard", permission: "DASHBOARD_VIEW", section: "Workspace" },
    { href: "/profiles", label: "My workspace", permission: "PROFILE_VIEW", section: "Workspace" },
  ],

  SALES_SUPPORT_EXECUTIVE: [
    { href: "/dashboard", label: "Dashboard", permission: "DASHBOARD_VIEW", section: "Workspace" },
    { href: "/profiles", label: "Sales Executives", permission: "PROFILE_VIEW", section: "People" },
    { href: "/my-tasks", label: "My tasks", permission: "SALES_SUPPORT_TASK_VIEW", section: "Work" },
  ],

  SUPER_ADMIN: [
    { href: "/dashboard", label: "Dashboard", permission: "DASHBOARD_VIEW", section: "Workspace" },
    { href: "/profiles", label: "Sales Executives", permission: "PROFILE_VIEW", section: "People" },
    { href: "/users", label: "Users", permission: "USER_VIEW", section: "People" },
    { href: "/teams", label: "Teams", permission: "TEAM_VIEW", section: "People" },
    { href: "/reports", label: "Reports", permission: "REPORT_VIEW", section: "Insight" },
    { href: "/activity-types", label: "Activity types", permission: "ACTIVITY_TYPE_MANAGE", section: "Administration" },
    { href: "/monitoring-checklists", label: "Checklists", permission: "MONITORING_CHECKLIST_MANAGE", section: "Administration" },
    { href: "/audit-logs", label: "Audit", permission: "AUDIT_VIEW", section: "Administration" },
  ],
};

export function navItemsForRole(
  roleCode: string,
  hasPermission: (code: string) => boolean,
): NavItem[] {
  const items = ROLE_NAV[roleCode as RoleCode] ?? [];
  return items.filter((item) => hasPermission(item.permission));
}

export function pathMatches(pathname: string, href: string): boolean {
  const pathOnly = (href.split("?")[0] ?? href).replace(/\/$/, "") || "/";
  if (pathOnly === "/dashboard") return pathname === "/dashboard";
  if (pathname === pathOnly) return true;
  if (pathname.startsWith("/sales-executives") && pathOnly === "/profiles") {
    return true;
  }
  if (!pathname.startsWith(`${pathOnly}/`)) return false;
  if (pathname === `${pathOnly}/new`) return false;
  return true;
}

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  "sales-executives": "Sales Executives",
  teams: "Teams",
  organization: "Organization",
  profiles: "Sales Executives",
  assignments: "Intervention history",
  referrals: "Interventions",
  swot: "SWOT",
  "daily-logs": "Daily coaching",
  "weekly-reviews": "Weekly Reviews",
  monitoring: "Live Monitoring",
  "monitoring-checklists": "Monitoring Checklists",
  "sync-evaluations": "Sync Evaluation",
  "role-assignments": "Role Assignment",
  eisenhower: "Eisenhower",
  "action-items": "Action Items",
  "my-tasks": "My Tasks",
  feedback: "Feedback",
  performance: "Progress",
  "activity-types": "Configuration",
  kpi: "KPI",
  reports: "Reports",
  "commando-performance": "Commando Performance",
  "audit-logs": "Audit Trail",
  new: "Create",
};

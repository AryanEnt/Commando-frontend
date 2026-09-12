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

const WORK = "Work";
const ADMINISTRATION = "Administration";
const GOVERNANCE = "Governance";

export const ROLE_NAV: Record<RoleCode, NavItem[]> = {
  TEAM_LEAD: [
    {
      href: "/dashboard",
      label: "Home",
      permission: "DASHBOARD_VIEW",
      section: WORK,
    },
    {
      href: "/profiles",
      label: "Sales Executives",
      permission: "PROFILE_VIEW",
      section: WORK,
    },
    {
      href: "/referrals",
      label: "Interventions",
      permission: "REFERRAL_VIEW",
      section: WORK,
    },
  ],

  COMMANDO_EXECUTIVE: [
    {
      href: "/dashboard",
      label: "Home",
      permission: "DASHBOARD_VIEW",
      section: WORK,
    },
    {
      href: "/profiles",
      label: "Sales Executives",
      permission: "PROFILE_VIEW",
      section: WORK,
    },
    {
      href: "/referrals",
      label: "Interventions",
      permission: "REFERRAL_VIEW",
      section: WORK,
    },
    {
      href: "/assignments",
      label: "History",
      permission: "ASSIGNMENT_VIEW",
      section: WORK,
    },
  ],

  SALES_EXECUTIVE: [
    // Primary nav is built dynamically in AppShell from the SE's own workspace.
    {
      href: "/dashboard",
      label: "My workspace",
      permission: "DASHBOARD_VIEW",
      section: WORK,
    },
  ],

  SALES_SUPPORT_EXECUTIVE: [
    {
      href: "/dashboard",
      label: "My workspace",
      permission: "DASHBOARD_VIEW",
      section: "My work",
    },
    {
      href: "/my-tasks",
      label: "My tasks",
      permission: "SALES_SUPPORT_TASK_VIEW",
      section: "My work",
    },
    {
      href: "/sync-evaluations",
      label: "Sync evaluations",
      permission: "SYNC_EVAL_VIEW",
      section: "My work",
    },
    {
      href: "/role-assignments",
      label: "Role assignments",
      permission: "ROLE_ASSIGNMENT_VIEW",
      section: "My work",
    },
  ],

  SUPER_ADMIN: [
    {
      href: "/dashboard",
      label: "Control Tower",
      permission: "DASHBOARD_VIEW",
      section: GOVERNANCE,
    },
    {
      href: "/profiles",
      label: "Sales Executives",
      permission: "PROFILE_VIEW",
      section: GOVERNANCE,
    },
    {
      href: "/referrals",
      label: "Interventions",
      permission: "REFERRAL_VIEW",
      section: GOVERNANCE,
    },
    {
      href: "/reports",
      label: "Reports",
      permission: "REPORT_VIEW",
      section: GOVERNANCE,
    },
    {
      href: "/users",
      label: "Users",
      permission: "USER_VIEW",
      section: ADMINISTRATION,
    },
    {
      href: "/teams",
      label: "Teams",
      permission: "TEAM_VIEW",
      section: ADMINISTRATION,
    },
    {
      href: "/configuration",
      label: "Configuration",
      permission: "ACTIVITY_TYPE_MANAGE",
      section: ADMINISTRATION,
    },
    {
      href: "/audit-logs",
      label: "Audit & History",
      permission: "AUDIT_VIEW",
      section: ADMINISTRATION,
    },
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
  if (
    pathOnly === "/configuration" &&
    (pathname.startsWith("/activity-types") ||
      pathname.startsWith("/monitoring-checklists"))
  ) {
    return true;
  }
  if (!pathname.startsWith(`${pathOnly}/`)) return false;
  if (pathname === `${pathOnly}/new`) return false;
  return true;
}

export function profileIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/profiles\/([^/]+)/);
  if (!match?.[1] || match[1] === "new") return null;
  return match[1];
}

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Home",
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
  monitoring: "Monitoring",
  "monitoring-checklists": "Checklists",
  "sync-evaluations": "Sync Evaluation",
  "role-assignments": "Role Assignment",
  eisenhower: "Eisenhower",
  "action-items": "Action Items",
  "my-tasks": "My Tasks",
  feedback: "Feedback",
  performance: "Goals",
  "activity-types": "Activity Types",
  configuration: "Configuration",
  kpi: "KPI",
  reports: "Reports",
  "commando-performance": "Commando Performance",
  "audit-logs": "Audit & History",
  new: "Create",
  coaching: "Coaching",
  reviews: "Weekly Reviews",
  actions: "Actions",
  support: "Support",
  interventions: "Interventions",
  history: "History",
};

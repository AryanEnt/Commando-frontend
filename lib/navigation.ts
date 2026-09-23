export type RoleCode =
  | "SUPER_ADMIN"
  | "TEAM_LEAD"
  | "COMMANDO_EXECUTIVE"
  | "SALES_EXECUTIVE"
  | "SALES_SUPPORT_EXECUTIVE";

export type NavIcon =
  | "dashboard"
  | "users"
  | "teams"
  | "organization"
  | "profiles"
  | "interventions"
  | "history"
  | "reports"
  | "audit"
  | "configuration"
  | "tasks"
  | "reviews"
  | "sync"
  | "roles"
  | "calendar";

export type NavItem = {
  href: string;
  label: string;
  permission: string;
  section?: string;
  icon?: NavIcon;
};

const OVERVIEW = "Overview";
const PEOPLE = "People";
const OPERATIONS = "Operations";
const REPORTING = "Reporting";
const CONFIGURATION = "Configuration";
const INTERVENTIONS = "Interventions";
const MY_WORK = "My work";
const MY_TEAM = "My team";

export const ROLE_NAV: Record<RoleCode, NavItem[]> = {
  TEAM_LEAD: [
    {
      href: "/dashboard",
      label: "Dashboard",
      permission: "DASHBOARD_VIEW",
      section: MY_TEAM,
      icon: "dashboard",
    },
    {
      href: "/profiles",
      label: "Sales Executives",
      permission: "PROFILE_VIEW",
      section: MY_TEAM,
      icon: "profiles",
    },
    {
      href: "/support",
      label: "Sales Support",
      permission: "SALES_SUPPORT_LINK_VIEW",
      section: MY_TEAM,
      icon: "users",
    },
    {
      href: "/teams",
      label: "Teams",
      permission: "TEAM_VIEW",
      section: MY_TEAM,
      icon: "teams",
    },
    {
      href: "/referrals",
      label: "Commando Requests",
      permission: "REFERRAL_VIEW",
      section: OPERATIONS,
      icon: "interventions",
    },
    {
      href: "/eisenhower",
      label: "Monthly Planning",
      permission: "EISENHOWER_VIEW",
      section: OPERATIONS,
      icon: "tasks",
    },
    {
      href: "/assignments",
      label: "Intervention History",
      permission: "ASSIGNMENT_VIEW",
      section: OPERATIONS,
      icon: "history",
    },
  ],

  COMMANDO_EXECUTIVE: [
    {
      href: "/dashboard",
      label: "Dashboard",
      permission: "DASHBOARD_VIEW",
      section: INTERVENTIONS,
      icon: "dashboard",
    },
    {
      href: "/profiles",
      label: "Sales Executives",
      permission: "PROFILE_VIEW",
      section: INTERVENTIONS,
      icon: "profiles",
    },
    {
      href: "/support",
      label: "Sales Support",
      permission: "SALES_SUPPORT_LINK_VIEW",
      section: INTERVENTIONS,
      icon: "users",
    },
    {
      href: "/referrals",
      label: "Requests & Interventions",
      permission: "REFERRAL_VIEW",
      section: INTERVENTIONS,
      icon: "interventions",
    },
    {
      href: "/eisenhower",
      label: "Eisenhower",
      permission: "EISENHOWER_VIEW",
      section: OPERATIONS,
      icon: "tasks",
    },
    {
      href: "/assignments",
      label: "History",
      permission: "ASSIGNMENT_VIEW",
      section: OPERATIONS,
      icon: "history",
    },
  ],

  SALES_EXECUTIVE: [
    {
      href: "/dashboard",
      label: "My workspace",
      permission: "DASHBOARD_VIEW",
      section: MY_WORK,
      icon: "dashboard",
    },
  ],

  SALES_SUPPORT_EXECUTIVE: [
    {
      href: "/dashboard",
      label: "Dashboard",
      permission: "DASHBOARD_VIEW",
      section: MY_WORK,
      icon: "dashboard",
    },
    {
      href: "/work-log",
      label: "Daily Work Log",
      permission: "DAILY_WORK_LOG_VIEW",
      section: MY_WORK,
      icon: "calendar",
    },
    {
      href: "/swot",
      label: "SWOT",
      permission: "SWOT_VIEW",
      section: MY_WORK,
      icon: "reviews",
    },
    {
      href: "/my-tasks",
      label: "My Support Tasks",
      permission: "SALES_SUPPORT_TASK_VIEW",
      section: MY_WORK,
      icon: "tasks",
    },
    {
      href: "/sync-evaluations",
      label: "Sync Evaluations",
      permission: "SYNC_EVAL_VIEW",
      section: MY_WORK,
      icon: "sync",
    },
  ],

  SUPER_ADMIN: [
    {
      href: "/dashboard",
      label: "Control Tower",
      permission: "DASHBOARD_VIEW",
      section: OVERVIEW,
      icon: "dashboard",
    },
    {
      href: "/users",
      label: "Users",
      permission: "USER_VIEW",
      section: PEOPLE,
      icon: "users",
    },
    {
      href: "/teams",
      label: "Teams",
      permission: "TEAM_VIEW",
      section: PEOPLE,
      icon: "teams",
    },
    {
      href: "/organization",
      label: "Organization",
      permission: "TEAM_VIEW",
      section: PEOPLE,
      icon: "organization",
    },
    {
      href: "/profiles",
      label: "Sales Executives",
      permission: "PROFILE_VIEW",
      section: PEOPLE,
      icon: "profiles",
    },
    {
      href: "/referrals",
      label: "Interventions",
      permission: "REFERRAL_VIEW",
      section: OPERATIONS,
      icon: "interventions",
    },
    {
      href: "/reports",
      label: "Reports",
      permission: "REPORT_VIEW",
      section: REPORTING,
      icon: "reports",
    },
    {
      href: "/configuration",
      label: "Configuration",
      permission: "ACTIVITY_TYPE_MANAGE",
      section: CONFIGURATION,
      icon: "configuration",
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

/** Routes that benefit from a wider main content column. */
export function isWideContentPath(pathname: string): boolean {
  return (
    pathname.startsWith("/users") ||
    pathname.startsWith("/audit-logs") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/organization") ||
    pathname.startsWith("/profiles/") ||
    pathname.startsWith("/support") ||
    pathname === "/dashboard"
  );
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
  eisenhower: "Eisenhower",
  "action-items": "Assignment",
  "my-tasks": "My Support Tasks",
  feedback: "Feedback",
  performance: "Performance",
  verdict: "TL Verdict",
  "activity-types": "Activity Types",
  configuration: "Configuration",
  kpi: "KPI",
  reports: "Reports",
  "commando-performance": "Commando Performance",
  "audit-logs": "Audit Trail",
  new: "Create",
  timeline: "Timeline",
  coaching: "Daily Logs",
  reviews: "Weekly Reviews",
  actions: "Assignment",
  support: "Support",
  interventions: "Interventions",
  history: "History",
};

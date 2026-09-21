import type { RoleCode } from "@/lib/navigation";

export type SeSection =
  | "overview"
  | "coaching"
  | "reviews"
  | "eisenhower"
  | "actions"
  | "feedback"
  | "performance"
  | "support"
  | "monitoring"
  | "checklist"
  | "interventions"
  | "history"
  | "swot"
  | "verdict"
  | "timeline";

export type SeNavIcon =
  | "dashboard"
  | "users"
  | "tasks"
  | "reviews"
  | "monitoring"
  | "feedback"
  | "history"
  | "calendar"
  | "report"
  | "referral"
  | "swot"
  | "check"
  | "clock";

export type SeNavItem = {
  section: SeSection;
  label: string;
  href: (profileId: string) => string;
  /** Optional sidebar group label (Sales Executive nav). */
  sectionGroup?: string;
  icon?: SeNavIcon;
  /** Highlight as the core workflow action (e.g. Monitoring for Commando). */
  primary?: boolean;
};

export type SeNavGroup = {
  id: "quick" | "activity" | "management" | "other";
  label: string;
  /** Quick Access — visually more prominent. */
  prominent?: boolean;
  items: SeNavItem[];
};

const ALL_ITEMS: SeNavItem[] = [
  {
    section: "overview",
    label: "Overview",
    href: (id) => `/profiles/${id}`,
    icon: "dashboard",
  },
  {
    section: "timeline",
    label: "Timeline",
    href: (id) => `/profiles/${id}/timeline`,
    icon: "clock",
  },
  {
    section: "interventions",
    label: "Intervention",
    href: (id) => `/profiles/${id}/interventions`,
    icon: "referral",
  },
  {
    section: "verdict",
    label: "TL Verdict",
    href: (id) => `/profiles/${id}/verdict`,
    icon: "check",
  },
  {
    section: "coaching",
    label: "Daily Logs",
    href: (id) => `/profiles/${id}/coaching`,
    icon: "reviews",
  },
  {
    section: "checklist",
    label: "Checklist",
    href: (id) => `/profiles/${id}/checklist`,
    icon: "check",
  },
  {
    section: "monitoring",
    label: "Monitor",
    href: (id) => `/profiles/${id}/monitoring`,
    icon: "monitoring",
  },
  {
    section: "reviews",
    label: "Weekly Reviews",
    href: (id) => `/profiles/${id}/reviews`,
    icon: "reviews",
  },
  {
    section: "actions",
    label: "Assignment",
    href: (id) => `/profiles/${id}/actions`,
    icon: "tasks",
  },
  {
    section: "eisenhower",
    label: "Eisenhower",
    href: (id) => `/profiles/${id}/eisenhower`,
    icon: "calendar",
  },
  {
    section: "support",
    label: "Support",
    href: (id) => `/profiles/${id}/support`,
    icon: "users",
  },
  {
    section: "feedback",
    label: "Feedback",
    href: (id) => `/profiles/${id}/feedback`,
    icon: "feedback",
  },
  {
    section: "performance",
    label: "Performance",
    href: (id) => `/profiles/${id}/performance`,
    icon: "report",
  },
  {
    section: "swot",
    label: "SWOT",
    href: (id) => `/profiles/${id}/swot`,
    icon: "swot",
  },
  {
    section: "history",
    label: "History",
    href: (id) => `/profiles/${id}/history`,
    icon: "history",
  },
];

const bySection = () => new Map(ALL_ITEMS.map((item) => [item.section, item]));

function item(
  section: SeSection,
  overrides?: Partial<SeNavItem>,
): SeNavItem {
  const base = bySection().get(section);
  if (!base) throw new Error(`Unknown SE section: ${section}`);
  return { ...base, ...overrides };
}

/** Flat sections available per role (legacy consumers + mobile select). */
const ROLE_SECTIONS: Record<RoleCode, SeSection[]> = {
  TEAM_LEAD: [
    "overview",
    "timeline",
    "performance",
    "verdict",
    "swot",
    "coaching",
    "checklist",
    "monitoring",
    "reviews",
    "eisenhower",
    "support",
    "history",
    "actions",
    "feedback",
    "interventions",
  ],
  COMMANDO_EXECUTIVE: [
    "monitoring",
    "checklist",
    "actions",
    "feedback",
    "performance",
    "timeline",
    "overview",
    "swot",
    "coaching",
    "reviews",
    "eisenhower",
    "support",
    "history",
    "interventions",
  ],
  SALES_EXECUTIVE: [
    "overview",
    "timeline",
    "reviews",
    "actions",
    "eisenhower",
    "support",
    "feedback",
    "history",
    "performance",
  ],
  SALES_SUPPORT_EXECUTIVE: ["overview", "support", "actions", "history"],
  SUPER_ADMIN: [
    "monitoring",
    "checklist",
    "actions",
    "feedback",
    "performance",
    "timeline",
    "overview",
    "swot",
    "coaching",
    "reviews",
    "eisenhower",
    "support",
    "history",
    "interventions",
  ],
};

/** Grouped manager sidebar (Commando / Team Lead / Super Admin). */
export function seGroupedNavForRole(roleCode: string): SeNavGroup[] {
  if (roleCode === "TEAM_LEAD") {
    return [
      {
        id: "quick",
        label: "Quick access",
        prominent: true,
        items: [
          item("overview"),
          item("performance"),
          item("verdict"),
          item("swot"),
        ],
      },
      {
        id: "activity",
        label: "Activity",
        items: [
          item("timeline"),
          item("coaching"),
          item("checklist"),
          item("monitoring"),
        ],
      },
      {
        id: "management",
        label: "Management",
        items: [item("reviews"), item("eisenhower")],
      },
      {
        id: "other",
        label: "Other",
        items: [
          item("support"),
          item("history"),
          item("actions"),
          item("feedback"),
          item("interventions"),
        ],
      },
    ];
  }

  // Commando + Super Admin
  return [
    {
      id: "quick",
      label: "Quick access",
      prominent: true,
      items: [
        item("monitoring", { primary: true }),
        item("checklist"),
        item("actions"),
        item("feedback"),
        item("performance"),
      ],
    },
    {
      id: "activity",
      label: "Activity",
      items: [item("timeline"), item("coaching")],
    },
    {
      id: "management",
      label: "Management",
      items: [
        item("overview"),
        item("swot"),
        item("reviews"),
        item("eisenhower"),
      ],
    },
    {
      id: "other",
      label: "Other",
      items: [item("support"), item("history"), item("interventions")],
    },
  ];
}

export function seNavForRole(roleCode: string): SeNavItem[] {
  const sections =
    ROLE_SECTIONS[roleCode as RoleCode] ?? ROLE_SECTIONS.COMMANDO_EXECUTIVE;
  const map = bySection();
  return sections
    .map((section) => map.get(section))
    .filter((navItem): navItem is SeNavItem => Boolean(navItem))
    .map((navItem) => {
      if (roleCode === "SALES_EXECUTIVE") {
        if (navItem.section === "overview") {
          return {
            ...navItem,
            label: "My workspace",
            sectionGroup: "My performance",
          };
        }
        if (navItem.section === "reviews") {
          return {
            ...navItem,
            label: "My Reviews",
            sectionGroup: "My performance",
          };
        }
        if (navItem.section === "actions") {
          return {
            ...navItem,
            label: "My Assignment",
            sectionGroup: "My performance",
          };
        }
        if (navItem.section === "eisenhower") {
          return {
            ...navItem,
            label: "Monthly Planning",
            sectionGroup: "Planning",
          };
        }
        if (navItem.section === "support") {
          return { ...navItem, label: "Support Team", sectionGroup: "Support" };
        }
        if (navItem.section === "feedback") {
          return { ...navItem, label: "Feedback", sectionGroup: "Development" };
        }
        if (navItem.section === "history") {
          return { ...navItem, label: "History", sectionGroup: "Development" };
        }
        if (navItem.section === "performance") {
          return {
            ...navItem,
            label: "Performance",
            sectionGroup: "Development",
          };
        }
        return navItem;
      }
      if (roleCode === "SALES_SUPPORT_EXECUTIVE") {
        if (navItem.section === "support") {
          return { ...navItem, label: "My support" };
        }
        if (navItem.section === "actions") {
          return { ...navItem, label: "Related assignment" };
        }
        return navItem;
      }
      return navItem;
    });
}

const PATH_SECTIONS: SeSection[] = [
  "coaching",
  "checklist",
  "monitoring",
  "reviews",
  "eisenhower",
  "actions",
  "support",
  "interventions",
  "feedback",
  "performance",
  "history",
  "swot",
  "verdict",
  "timeline",
];

export function seSectionFromPathname(pathname: string): SeSection {
  const match = pathname.match(/^\/profiles\/[^/]+(?:\/([^/]+))?/);
  const segment = match?.[1];
  if (!segment) return "overview";
  /** Daily Log journal lives under /daily-logs/:id but belongs to coaching. */
  if (segment === "daily-logs") return "coaching";
  if (PATH_SECTIONS.includes(segment as SeSection)) {
    return segment as SeSection;
  }
  return "overview";
}

export function seDailyLogHref(profileId: string, logId: string) {
  return `/profiles/${profileId}/daily-logs/${logId}`;
}

export function seWorkspaceHref(profileId: string, section?: SeSection) {
  if (!section || section === "overview") return `/profiles/${profileId}`;
  return `/profiles/${profileId}/${section}`;
}

export function seSectionLabel(section: SeSection): string {
  const fromNav = ALL_ITEMS.find((navItem) => navItem.section === section);
  if (fromNav) return fromNav.label;
  return "Overview";
}

export function seCreateHref(
  profileId: string,
  kind:
    | "monitoring"
    | "daily-log"
    | "weekly-review"
    | "action"
    | "feedback"
    | "swot"
    | "eisenhower",
) {
  switch (kind) {
    case "monitoring":
      return `/profiles/${profileId}/monitoring/new`;
    case "daily-log":
      return `/profiles/${profileId}/coaching/new`;
    case "weekly-review":
      return `/profiles/${profileId}/reviews/new`;
    case "action":
      return `/profiles/${profileId}/actions/new`;
    case "feedback":
      return `/profiles/${profileId}/feedback/new`;
    case "swot":
      return `/swot/new?profileId=${profileId}&returnTo=${encodeURIComponent(`/profiles/${profileId}/swot`)}`;
    case "eisenhower":
      // Priorities are created via Daily Log (urgency + importance).
      return `/profiles/${profileId}/coaching/new`;
  }
}

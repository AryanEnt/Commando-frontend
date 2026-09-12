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
  | "interventions"
  | "history";

export type SeNavItem = {
  section: SeSection;
  label: string;
  href: (profileId: string) => string;
  /** Optional sidebar group label (Sales Executive nav). */
  sectionGroup?: string;
};

const ALL_ITEMS: SeNavItem[] = [
  { section: "overview", label: "Overview", href: (id) => `/profiles/${id}` },
  {
    section: "interventions",
    label: "Intervention",
    href: (id) => `/profiles/${id}/interventions`,
  },
  {
    section: "coaching",
    label: "Coaching",
    href: (id) => `/profiles/${id}/coaching`,
  },
  {
    section: "monitoring",
    label: "Monitoring",
    href: (id) => `/profiles/${id}/monitoring`,
  },
  {
    section: "reviews",
    label: "Reviews",
    href: (id) => `/profiles/${id}/reviews`,
  },
  {
    section: "actions",
    label: "Actions",
    href: (id) => `/profiles/${id}/actions`,
  },
  {
    section: "eisenhower",
    label: "Eisenhower",
    href: (id) => `/profiles/${id}/eisenhower`,
  },
  {
    section: "support",
    label: "Support",
    href: (id) => `/profiles/${id}/support`,
  },
  {
    section: "feedback",
    label: "Feedback",
    href: (id) => `/profiles/${id}/feedback`,
  },
  {
    section: "performance",
    label: "Goals",
    href: (id) => `/profiles/${id}/performance`,
  },
  {
    section: "history",
    label: "History",
    href: (id) => `/profiles/${id}/history`,
  },
];

/** Sections available per role. */
const ROLE_SECTIONS: Record<RoleCode, SeSection[]> = {
  TEAM_LEAD: [
    "overview",
    "interventions",
    "coaching",
    "monitoring",
    "reviews",
    "actions",
    "eisenhower",
    "support",
    "feedback",
    "performance",
    "history",
  ],
  COMMANDO_EXECUTIVE: [
    "overview",
    "interventions",
    "coaching",
    "monitoring",
    "reviews",
    "actions",
    "eisenhower",
    "support",
    "feedback",
    "performance",
    "history",
  ],
  SALES_EXECUTIVE: [
    "overview",
    "reviews",
    "performance",
    "actions",
    "feedback",
    "eisenhower",
    "support",
    "history",
  ],
  SALES_SUPPORT_EXECUTIVE: ["overview", "support", "actions", "history"],
  SUPER_ADMIN: [
    "overview",
    "interventions",
    "coaching",
    "monitoring",
    "reviews",
    "actions",
    "eisenhower",
    "support",
    "feedback",
    "performance",
    "history",
  ],
};

export function seNavForRole(roleCode: string): SeNavItem[] {
  const sections =
    ROLE_SECTIONS[roleCode as RoleCode] ?? ROLE_SECTIONS.COMMANDO_EXECUTIVE;
  const bySection = new Map(ALL_ITEMS.map((item) => [item.section, item]));
  return sections
    .map((section) => bySection.get(section))
    .filter((item): item is SeNavItem => Boolean(item))
    .map((item) => {
      if (roleCode === "SALES_EXECUTIVE") {
        if (item.section === "overview") {
          return { ...item, label: "Overview", sectionGroup: "My performance" };
        }
        if (item.section === "reviews") {
          return { ...item, label: "Weekly Reviews", sectionGroup: "My performance" };
        }
        if (item.section === "performance") {
          return { ...item, label: "Development", sectionGroup: "My performance" };
        }
        if (item.section === "actions") {
          return { ...item, label: "Actions", sectionGroup: "My performance" };
        }
        if (item.section === "feedback") {
          return { ...item, label: "Feedback", sectionGroup: "My performance" };
        }
        if (item.section === "eisenhower") {
          return { ...item, label: "Monthly Planning", sectionGroup: "Planning" };
        }
        if (item.section === "support") {
          return { ...item, label: "Support Team", sectionGroup: "Support" };
        }
        if (item.section === "history") {
          return { ...item, label: "History", sectionGroup: "Activity" };
        }
        return item;
      }
      if (roleCode === "SALES_SUPPORT_EXECUTIVE") {
        if (item.section === "support") {
          return { ...item, label: "My support" };
        }
        if (item.section === "actions") {
          return { ...item, label: "Related actions" };
        }
        return item;
      }
      return item;
    });
}

export function seSectionFromPathname(pathname: string): SeSection {
  const match = pathname.match(/^\/profiles\/[^/]+(?:\/([^/]+))?/);
  const segment = match?.[1];
  if (!segment) return "overview";
  if (
    (
      [
        "coaching",
        "monitoring",
        "reviews",
        "eisenhower",
        "actions",
        "support",
        "interventions",
        "feedback",
        "performance",
        "history",
      ] as SeSection[]
    ).includes(segment as SeSection)
  ) {
    return segment as SeSection;
  }
  return "overview";
}

export function seWorkspaceHref(profileId: string, section?: SeSection) {
  if (!section || section === "overview") return `/profiles/${profileId}`;
  return `/profiles/${profileId}/${section}`;
}

export function seSectionLabel(section: SeSection): string {
  const fromNav = ALL_ITEMS.find((item) => item.section === section);
  if (fromNav) return fromNav.label;
  if (section === "interventions") return "Interventions";
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
  options?: { category?: string },
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
      return `/swot/new?profileId=${profileId}&returnTo=${encodeURIComponent(`/profiles/${profileId}`)}`;
    case "eisenhower": {
      const params = new URLSearchParams({
        profileId,
        returnTo: `/profiles/${profileId}/eisenhower`,
      });
      if (options?.category) params.set("category", options.category);
      return `/eisenhower/new?${params.toString()}`;
    }
  }
}

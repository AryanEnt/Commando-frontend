export function roleLabel(code: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    TEAM_LEAD: "Team Lead",
    COMMANDO_EXECUTIVE: "Commando",
    SALES_EXECUTIVE: "Sales Executive",
    SALES_SUPPORT_EXECUTIVE: "Sales Support",
  };
  return map[code] ?? code.replaceAll("_", " ");
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    IN_PROGRESS: "In progress",
    BLOCKED: "Blocked",
    COMPLETED: "Completed",
    OVERDUE: "Overdue",
    ACTIVE: "Active",
    HISTORY: "History",
    ACKNOWLEDGED: "Acknowledged",
    SUBMITTED: "Submitted",
    OPEN: "Open",
    DONE: "Done",
    EXPIRED: "Expired",
    REPLACED: "Replaced",
    CANCELLED: "Cancelled",
    DRAFT: "Draft",
    INACTIVE: "Inactive",
    ARCHIVED: "Archived",
    EXITED: "Exited",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
    TEAM_LEAD: "Team Lead",
    COMMANDO: "Commando",
    SALES_EXECUTIVE: "Sales Executive",
    YES: "Yes",
    NO: "No",
  };
  return map[status.toUpperCase()] ?? status.replaceAll("_", " ");
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function personName(p: {
  firstName?: string;
  lastName?: string;
} | null | undefined): string {
  if (!p) return "—";
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—";
}

export function responsibilityTypeLabel(code: string): string {
  const map: Record<string, string> = {
    GENERAL: "General",
    PRODUCT: "Product",
    PRICING: "Pricing",
    PROPOSAL: "Proposal",
    CUSTOMER: "Customer",
    TECHNICAL: "Technical",
    PIPELINE: "Pipeline",
    OTHER: "Other",
  };
  return map[code] ?? code.replaceAll("_", " ");
}

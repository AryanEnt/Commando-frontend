import type { SwotItem } from "@/lib/api";
import { personName } from "@/lib/labels";

export function swotSubjectName(item: SwotItem): string {
  if (item.subject?.name?.trim()) return item.subject.name.trim();
  if (item.profile?.displayName?.trim()) return item.profile.displayName.trim();
  if (item.executiveUser) return personName(item.executiveUser);
  if (item.subjectUser) return personName(item.subjectUser);
  return "Unknown";
}

export function swotSubjectRoleLabel(item: SwotItem): string {
  if (
    item.subject?.type === "SALES_SUPPORT_EXECUTIVE" ||
    item.subject?.type === "EXECUTIVE" ||
    item.subjectType === "EXECUTIVE" ||
    item.executiveUserId ||
    item.subjectUserId ||
    item.source === "SALES_SUPPORT_EXECUTIVE"
  ) {
    if (
      item.executiveUser?.role?.code === "SALES_SUPPORT_EXECUTIVE" ||
      item.subjectUser?.role?.code === "SALES_SUPPORT_EXECUTIVE" ||
      item.source === "SALES_SUPPORT_EXECUTIVE" ||
      item.subject?.type === "SALES_SUPPORT_EXECUTIVE"
    ) {
      return "Sales Support Executive";
    }
    if (item.executiveUser?.role?.code === "SALES_EXECUTIVE") {
      return "Sales Executive";
    }
    return "Sales Support Executive";
  }
  return "Sales Executive";
}

export function swotSourceLabel(source: SwotItem["source"]): string {
  if (source === "TEAM_LEAD") return "Team Lead";
  if (source === "COMMANDO") return "Commando";
  if (source === "SALES_SUPPORT_EXECUTIVE") return "Self";
  if (source === "SALES_EXECUTIVE") return "Self";
  return source;
}

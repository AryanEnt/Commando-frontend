import type { Assignment } from "@/lib/api";

export const INTERVENTION_STAGES = [
  { key: "REFER", label: "Referral", hint: "Team Lead sends information" },
  { key: "ASSESS", label: "Handoff", hint: "Acknowledge and start" },
  { key: "COACH", label: "Coaching", hint: "Active intervention" },
  { key: "MONITOR", label: "Monitoring", hint: "Live observation" },
  { key: "REVIEW", label: "Review", hint: "Weekly review" },
  { key: "EXIT", label: "Complete", hint: "Assignment ended" },
] as const;

export const REFERRAL_STAGES = [
  { key: "SUBMITTED", label: "Submitted", hint: "Waiting for next step" },
  {
    key: "ACKNOWLEDGED",
    label: "Acknowledged",
    hint: "Assignment active; ready to coach",
  },
  { key: "IN_PROGRESS", label: "In progress", hint: "Handoff underway" },
  { key: "COMPLETED", label: "Handoff closed", hint: "Coaching may still be active" },
] as const;

export function interventionStageFromAssignment(
  assignment: Assignment | null,
  referralStatus?: string | null,
): string {
  if (assignment?.status === "COMPLETED" || assignment?.status === "EXITED") {
    return "EXIT";
  }
  if (assignment && assignment.status === "ACTIVE") {
    return "COACH";
  }
  const r = referralStatus?.toUpperCase();
  if (r === "IN_PROGRESS") return "COACH";
  if (r === "ACKNOWLEDGED") return "ASSESS";
  if (r === "SUBMITTED") return "REFER";
  if (r === "COMPLETED") return "REFER";
  return "REFER";
}

export function referralNextAction(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "Waiting for Team Lead review and management context.";
    case "ACKNOWLEDGED":
      return "Review the Team Lead management packet, then acknowledge & start the intervention.";
    case "IN_PROGRESS":
      return "Coach from the Sales Executive workspace. Closing this handoff does not end the assignment.";
    case "COMPLETED":
      return "This handoff is closed. If the assignment is still Active, coaching continues until you Complete intervention.";
    case "REJECTED":
      return "This request was rejected. No intervention was started.";
    default:
      return "No further action on this referral.";
  }
}

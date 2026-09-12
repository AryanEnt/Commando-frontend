import type { Referral } from "@/lib/api";

/** Phase-aware progress for Commando-initiated intervention requests. */
export const INTERVENTION_REQUEST_STAGES = [
  {
    key: "REQUEST_SENT",
    label: "Request submitted",
    hint: "Commando sent the request",
  },
  {
    key: "TL_REVIEW",
    label: "Team Lead review",
    hint: "Management context pending",
  },
  {
    key: "HANDOFF",
    label: "Management handoff",
    hint: "Awaiting Commando start",
  },
  {
    key: "IN_PROGRESS",
    label: "In progress",
    hint: "Active intervention",
  },
  {
    key: "COMPLETED",
    label: "Handoff closed",
    hint: "Request closed",
  },
] as const;

export type InterventionRequestStageKey =
  (typeof INTERVENTION_REQUEST_STAGES)[number]["key"];

export function isPendingTeamLeadReview(referral: Referral): boolean {
  return (
    referral.initiatedBy === "COMMANDO" &&
    referral.status === "SUBMITTED" &&
    !referral.informationProvidedAt
  );
}

export function hasManagementPacket(referral: Referral): boolean {
  if (referral.informationProvidedAt) return true;
  if (referral.status === "REJECTED") return false;
  if (isPendingTeamLeadReview(referral)) return false;
  const pending = "(Pending Team Lead information)";
  return (
    referral.whySalesIsDown !== pending &&
    Boolean(referral.whySalesIsDown?.trim())
  );
}

export function interventionRequestStageKey(
  referral: Referral,
): InterventionRequestStageKey | "REJECTED" {
  if (referral.status === "REJECTED") return "REJECTED";
  if (referral.status === "COMPLETED") return "COMPLETED";
  if (referral.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (
    referral.status === "ACKNOWLEDGED" ||
    Boolean(referral.informationProvidedAt)
  ) {
    return "HANDOFF";
  }
  if (referral.status === "SUBMITTED") return "TL_REVIEW";
  return "REQUEST_SENT";
}

export function referralStatusLabel(referral: Referral): string {
  if (referral.status === "REJECTED") return "Request rejected";
  if (isPendingTeamLeadReview(referral)) return "Waiting for Team Lead review";
  if (referral.status === "ACKNOWLEDGED") {
    return "Awaiting Commando acknowledgement";
  }
  if (referral.status === "IN_PROGRESS") return "Intervention in progress";
  if (referral.status === "COMPLETED") return "Handoff closed";
  if (referral.status === "SUBMITTED") return "Request submitted";
  return referral.status.replaceAll("_", " ");
}

export function referralPageTitle(referral: Referral): string {
  if (referral.status === "REJECTED") return "Rejected Request";
  if (isPendingTeamLeadReview(referral)) return "Intervention Request";
  if (referral.status === "ACKNOWLEDGED") return "Intervention Handoff";
  if (referral.status === "IN_PROGRESS") return "Active Intervention";
  if (referral.status === "COMPLETED") return "Completed Intervention";
  return "Intervention Request";
}

export function referralPhaseHeadline(
  referral: Referral,
  roleCode: string | undefined,
): { eyebrow: string; title: string; body: string } {
  const tlName = `${referral.teamLead.firstName} ${referral.teamLead.lastName}`.trim();
  const isTl = roleCode === "TEAM_LEAD" || roleCode === "SUPER_ADMIN";
  const isCommando = roleCode === "COMMANDO_EXECUTIVE";

  if (referral.status === "REJECTED") {
    return {
      eyebrow: "Rejected",
      title: "Request rejected",
      body: referral.rejectionReason
        ? `Reason: ${referral.rejectionReason}`
        : "This intervention request was rejected.",
    };
  }

  if (isPendingTeamLeadReview(referral)) {
    if (isCommando) {
      return {
        eyebrow: "Request sent",
        title: "Waiting for Team Lead review",
        body: `Your request has been submitted to ${tlName}, Team Lead. No action is required from you until the management context is provided.`,
      };
    }
    if (isTl) {
      return {
        eyebrow: "Request review",
        title: "Review and provide management context",
        body: "Review the Commando's request, complete the management packet, then approve or reject.",
      };
    }
    return {
      eyebrow: "Submitted",
      title: "Waiting for Team Lead review",
      body: "The Team Lead must provide management context before the intervention can begin.",
    };
  }

  if (referral.status === "ACKNOWLEDGED") {
    if (isCommando) {
      return {
        eyebrow: "Management handoff received",
        title: "Ready for acknowledgement",
        body: "The Team Lead approved this request and provided management context. Review the packet, then start the intervention.",
      };
    }
    return {
      eyebrow: "Approved",
      title: "Awaiting Commando acknowledgement",
      body: "Management information has been handed to the Commando. The intervention starts when they acknowledge.",
    };
  }

  if (referral.status === "IN_PROGRESS") {
    return {
      eyebrow: "In progress",
      title: "Intervention is active",
      body: "Work from the Sales Executive workspace — coaching, monitoring, actions, and reviews.",
    };
  }

  if (referral.status === "COMPLETED") {
    return {
      eyebrow: "Closed",
      title: "Handoff closed",
      body: "This request is closed. Historical management context remains available.",
    };
  }

  return {
    eyebrow: "Intervention",
    title: referralPageTitle(referral),
    body: "",
  };
}

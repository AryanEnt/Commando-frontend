import type { WeeklyReview } from "@/lib/api";
import { personName } from "@/lib/labels";

export function weeklyReviewSubjectName(review: WeeklyReview): string {
  if (review.subject?.name?.trim()) return review.subject.name.trim();
  if (review.profile?.displayName?.trim()) return review.profile.displayName.trim();
  if (review.executiveUser) return personName(review.executiveUser);
  return "Unknown";
}

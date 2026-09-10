"use client";

import { PageHeader, EmptyState } from "@/components/ui";

export default function KpiPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="KPI"
        description="Organization KPI reporting will appear here."
      />
      <EmptyState
        title="Coming soon"
        description="KPI dashboards and exportable scorecards are planned for a later phase."
      />
    </div>
  );
}

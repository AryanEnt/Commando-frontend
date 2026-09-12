"use client";

import { SeContextualCreatePage } from "@/components/SeContextualCreatePage";
import { MonitoringSessionForm } from "@/components/monitoring/MonitoringSessionForm";
import { useOptionalSeWorkspace } from "@/lib/se-workspace-context";

export default function ContextualMonitoringNewPage() {
  return (
    <SeContextualCreatePage
      title="New Monitoring Session"
      description="Record observations and performance against the selected checklist."
      permission="MONITORING_CREATE"
      returnHref={(id) => `/profiles/${id}/monitoring`}
      returnLabel="Back to Monitoring"
      successToast={false}
    >
      {({
        profile,
        profileId,
        submitting,
        setSubmitting,
        setError,
        onSuccess,
      }) => (
        <ContextualMonitoringForm
          profile={profile}
          profileId={profileId}
          submitting={submitting}
          setSubmitting={setSubmitting}
          setError={setError}
          onSuccess={onSuccess}
        />
      )}
    </SeContextualCreatePage>
  );
}

function ContextualMonitoringForm({
  profile,
  profileId,
  submitting,
  setSubmitting,
  setError,
  onSuccess,
}: {
  profile: { displayName: string };
  profileId: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  onSuccess: (href: string) => void;
}) {
  const se = useOptionalSeWorkspace();
  const activeSupport = se?.supportTeam?.activeSupport;

  return (
    <MonitoringSessionForm
      profileId={profileId}
      profileName={profile.displayName}
      submitting={submitting}
      setSubmitting={setSubmitting}
      setError={setError}
      activeSupport={activeSupport}
      onSuccess={(_recordId) =>
        onSuccess(`/profiles/${profileId}/monitoring`)
      }
    />
  );
}

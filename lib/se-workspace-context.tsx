"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  type InterventionWorkspace,
  type ProfileDetail,
  type SeSupportTeamContext,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type SeWorkspaceContextValue = {
  profileId: string;
  profile: ProfileDetail | null;
  workspace: InterventionWorkspace | null;
  supportTeam: SeSupportTeamContext | null;
  loading: boolean;
  error: string | null;
  teamLeadLocked: boolean;
  reload: () => Promise<void>;
};

const SeWorkspaceContext = createContext<SeWorkspaceContextValue | null>(null);

export function SeWorkspaceProvider({
  profileId,
  children,
}: {
  profileId: string;
  children: ReactNode;
}) {
  const { token, user, hasPermission } = useAuth();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [workspace, setWorkspace] = useState<InterventionWorkspace | null>(
    null,
  );
  const [supportTeam, setSupportTeam] = useState<SeSupportTeamContext | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewSupport = hasPermission("SALES_SUPPORT_LINK_VIEW");

  const reload = useCallback(async () => {
    if (!token || !profileId) return;
    setLoading(true);
    try {
      const [profileRes, workspaceRes, supportRes] = await Promise.all([
        api.getProfile(token, profileId),
        api.getIntervention(token, profileId).catch(() => null),
        canViewSupport
          ? api.getSeSupportTeam(token, profileId).catch(() => null)
          : Promise.resolve(null),
      ]);
      setProfile(profileRes.data.profile);
      setWorkspace(workspaceRes?.data ?? null);
      setSupportTeam(supportRes?.data ?? null);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't load this workspace.",
      );
      setProfile(null);
      setWorkspace(null);
      setSupportTeam(null);
    } finally {
      setLoading(false);
    }
  }, [token, profileId, canViewSupport]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<SeWorkspaceContextValue>(
    () => ({
      profileId,
      profile,
      workspace,
      supportTeam,
      loading,
      error,
      teamLeadLocked:
        user?.roleCode === "TEAM_LEAD" &&
        Boolean(profile?.currentAssignment),
      reload,
    }),
    [
      profileId,
      profile,
      workspace,
      supportTeam,
      loading,
      error,
      user?.roleCode,
      reload,
    ],
  );

  return (
    <SeWorkspaceContext.Provider value={value}>
      {children}
    </SeWorkspaceContext.Provider>
  );
}

export function useSeWorkspace() {
  const ctx = useContext(SeWorkspaceContext);
  if (!ctx) {
    throw new Error("useSeWorkspace must be used within SeWorkspaceProvider");
  }
  return ctx;
}

export function useOptionalSeWorkspace() {
  return useContext(SeWorkspaceContext);
}

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
  type EligibleSupportUser,
  type SalesSupportLink,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName } from "@/lib/labels";

export type SseWorkspaceSubject = {
  userId: string;
  displayName: string;
  email: string;
  teamName: string | null;
  supportUser: EligibleSupportUser | null;
  links: SalesSupportLink[];
};

type SseWorkspaceContextValue = {
  userId: string;
  subject: SseWorkspaceSubject | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const SseWorkspaceContext = createContext<SseWorkspaceContextValue | null>(
  null,
);

export function SseWorkspaceProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const { token } = useAuth();
  const [subject, setSubject] = useState<SseWorkspaceSubject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const [linksRes, eligibleRes] = await Promise.all([
        api.getSalesSupportLinks(token, {
          salesSupportUserId: userId,
          isActive: true,
          pageSize: 100,
        }),
        api.getEligibleSupportUsers(token).catch(() => null),
      ]);

      const links = linksRes.data.links.filter(
        (l) => l.salesSupportUserId === userId && l.isActive,
      );
      const eligible =
        eligibleRes?.data.users.find((u) => u.id === userId) ?? null;
      const fromLink = links[0]?.supportUser ?? null;

      if (!eligible && !fromLink) {
        setError(
          "This Sales Support was not found in your team scope.",
        );
        setSubject(null);
        return;
      }

      const person = eligible ?? fromLink!;
      setSubject({
        userId,
        displayName: personName(person),
        email: person.email,
        teamName: links[0]?.profile.team?.name ?? null,
        supportUser: eligible,
        links,
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't load this workspace.",
      );
      setSubject(null);
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<SseWorkspaceContextValue>(
    () => ({
      userId,
      subject,
      loading,
      error,
      reload,
    }),
    [userId, subject, loading, error, reload],
  );

  return (
    <SseWorkspaceContext.Provider value={value}>
      {children}
    </SseWorkspaceContext.Provider>
  );
}

export function useSseWorkspace() {
  const ctx = useContext(SseWorkspaceContext);
  if (!ctx) {
    throw new Error("useSseWorkspace must be used within SseWorkspaceProvider");
  }
  return ctx;
}

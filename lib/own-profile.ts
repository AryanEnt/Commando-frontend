"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Resolves the signed-in Sales Executive's profile id (scoped list returns only theirs).
 */
export function useOwnSalesProfileId() {
  const { token, user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    () => user?.roleCode === "SALES_EXECUTIVE",
  );

  useEffect(() => {
    if (!token || user?.roleCode !== "SALES_EXECUTIVE") {
      setProfileId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void api
      .getProfiles(token, { pageSize: 1 })
      .then((res) => {
        if (cancelled) return;
        setProfileId(res.data.profiles[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfileId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.roleCode]);

  return { profileId, loading };
}

export async function resolveOwnSalesProfileId(
  token: string,
): Promise<string | null> {
  const res = await api.getProfiles(token, { pageSize: 1 });
  return res.data.profiles[0]?.id ?? null;
}

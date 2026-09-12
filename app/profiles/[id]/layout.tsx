"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { SeWorkspaceShell } from "@/components/SeWorkspaceShell";
import { SeWorkspaceProvider } from "@/lib/se-workspace-context";

export default function SeProfileLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const profileId = params.id;

  if (!profileId) return children;

  return (
    <SeWorkspaceProvider profileId={profileId}>
      <SeWorkspaceShell>{children}</SeWorkspaceShell>
    </SeWorkspaceProvider>
  );
}

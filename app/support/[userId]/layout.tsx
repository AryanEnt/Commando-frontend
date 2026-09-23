"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { SseWorkspaceShell } from "@/components/SseWorkspaceShell";
import { SseWorkspaceProvider } from "@/lib/sse-workspace-context";

export default function SupportWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  if (!userId) return children;

  return (
    <SseWorkspaceProvider userId={userId}>
      <SseWorkspaceShell>{children}</SseWorkspaceShell>
    </SseWorkspaceProvider>
  );
}

"use client";

import { Skeleton } from "@/components/ui";

export function ControlTowerSkeleton() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="Loading control tower"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
          >
            <Skeleton className="h-10 w-10 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-3 h-3 w-24" />
            <Skeleton className="mt-2 h-8 w-14" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)]">
            <div className="border-b border-[var(--color-line)] px-5 py-4">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-2 h-3 w-64" />
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex gap-4 border-b border-[var(--color-line)] px-5 py-3.5 last:border-b-0"
              >
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 xl:col-span-4">
          <Skeleton className="h-24 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-32 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}

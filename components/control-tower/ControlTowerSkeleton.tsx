"use client";

import { Skeleton } from "@/components/ui";

export function ControlTowerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading control tower">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:grid-rows-2">
        <div className="col-span-2 row-span-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:col-span-5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-6 h-12 w-20" />
          <Skeleton className="mt-3 h-3 w-40" />
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:col-span-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="mt-4 h-8 w-10" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:col-span-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-8 w-10" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
        <div className="col-span-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:col-span-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-3 h-1.5 w-full" />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 lg:col-span-7">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-56" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="mb-1.5 h-3 w-28" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 lg:col-span-5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-5 w-40" />
          <Skeleton className="mt-6 h-4 w-52" />
          <Skeleton className="mt-2 h-3 w-64" />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] lg:col-span-7">
          <div className="border-b border-[var(--color-line)] px-5 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5 last:border-b-0"
            >
              <Skeleton className="h-9 w-9 rounded-[var(--radius-sm)]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 lg:col-span-5">
          <Skeleton className="h-4 w-32" />
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

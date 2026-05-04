import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarItemSkeletonProps {
  count?: number;
  className?: string;
}

export const SidebarItemSkeleton: React.FC<SidebarItemSkeletonProps> =
  React.memo(({ count = 1, className }) => {
    if (count <= 0) return null;

    return (
      <div
        className={className}
        role="status"
        aria-label={`Loading ${count} item${count === 1 ? "" : "s"}...`}
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={`skeleton-${index}`}
            className="flex items-center gap-3 p-3 h-17 animate-content-fade-in"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <Skeleton
              variant="shimmer"
              className="h-8 w-8 rounded shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton variant="shimmer" className="h-4 w-3/4" aria-hidden="true" />
              <Skeleton variant="shimmer" className="h-3 w-1/2" aria-hidden="true" />
            </div>
            <Skeleton
              variant="shimmer"
              className="h-6 w-6 rounded shrink-0"
              aria-hidden="true"
            />
          </div>
        ))}
        <span className="sr-only">Loading content, please wait...</span>
      </div>
    );
  });

SidebarItemSkeleton.displayName = "SidebarItemSkeleton";

import React from "react";
import { useBestiaryEntry } from "@/hooks/useBestiaryEntry";
import { useAppStore } from "@/store/appStore";
import { BestiaryEntry } from "./BestiaryEntry";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Icon } from "@/components/shared/Icon";
import type { ViewContext } from "@/types";

interface BestiaryPageProps {
  entryId: string;
  entryType: ViewContext;
}

const PageSkeleton: React.FC = () => (
  <div className="page-canvas h-full flex flex-col p-12 animate-content-fade-in">
    <Skeleton variant="shimmer" className="h-10 w-1/3 mb-4" />
    <Skeleton variant="shimmer" className="h-6 w-2/3 mb-8" />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-4">
        <SkeletonText variant="shimmer" lines={4} lastLineWidth="80%" />
        <Skeleton variant="shimmer" className="h-32 w-full mt-4" />
      </div>

      <div className="lg:col-span-1 space-y-4">
        <Skeleton variant="shimmer" className="h-48 w-full" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton variant="shimmer" className="h-12" />
          <Skeleton variant="shimmer" className="h-12" />
          <Skeleton variant="shimmer" className="h-12" />
        </div>
      </div>
    </div>
  </div>
);

const ErrorState: React.FC<{ entryType: ViewContext; entryId: string }> = ({
  entryType,
  entryId,
}) => (
  <div className="flex items-center justify-center h-full text-center p-8 animate-fade-in">
    <div className="flex flex-col items-center gap-4 text-card-foreground">
      <Icon
        category="ui"
        name="search"
        size="4xl"
        className="text-destructive"
      />
      <h3 className="text-xl font-bold font-display">Entry Not Found</h3>
      <p className="text-muted-foreground font-serif max-w-md">
        The requested {entryType.slice(0, -1)} with ID "{entryId}" could not be
        found. It may have been deleted or the link may be incorrect.
      </p>
    </div>
  </div>
);

export const BestiaryPage: React.FC<BestiaryPageProps> = ({
  entryId,
  entryType,
}) => {
  const { data } = useBestiaryEntry(entryType, entryId);
  const isAppInitializing = useAppStore((s) => s.isLoading);


  if (data) {
    return (
      <div key={entryId} className="h-full animate-fade-in">
        <BestiaryEntry entry={data} entryType={entryType} />
      </div>
    );
  }

  if (isAppInitializing) {
    return <PageSkeleton />;
  }

  return <ErrorState entryType={entryType} entryId={entryId} />;
};
import React from "react";
import { useSidebarData, type SidebarItem as SidebarItemData } from "@/hooks/useSidebarData";
import { useSidebarContext } from "./SidebarContext";
import { useAppStore } from "@/store/appStore";
import { SidebarItem } from "./SidebarItem";
import { SidebarItemSkeleton } from "./SidebarSkeleton";
import { Scroll } from "lucide-react";
import type { VirtualItem } from "@tanstack/react-virtual";

const EmptyState = React.memo(() => {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const { contextConfig } = useSidebarContext();

  return (
    <div className="p-8 text-center text-muted-foreground animate-fade-in">
      <Scroll className="w-8 h-8 mx-auto mb-4 text-rune/60" aria-hidden="true" />
      <h4 className="font-display text-leather mb-1">
        {searchQuery ? "No Results" : "Empty Archives"}
      </h4>
      <p className="text-sm font-serif">
        {searchQuery
          ? `No entries found for "${searchQuery}".`
          : `This section for ${contextConfig.label.toLowerCase()} awaits your wisdom.`}
      </p>
    </div>
  );
});

EmptyState.displayName = "EmptyState";

const LoadingSkeleton = React.memo(() => (
  <div className="p-4 space-y-2">
    <SidebarItemSkeleton count={8} />
  </div>
));

LoadingSkeleton.displayName = "LoadingSkeleton";

export const SidebarList = React.memo(() => {
  const { parentRef, loading, itemsToDisplay, rowVirtualizer } = useSidebarData();
  const { contextConfig } = useSidebarContext();

  if (loading && itemsToDisplay.length === 0) {
    return <LoadingSkeleton />;
  }

  if (!loading && itemsToDisplay.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      ref={parentRef}
      className="p-4"
      role="list"
      aria-label={`${contextConfig.label} list`}
      aria-busy={loading}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
          const isLoaderRow = virtualItem.index > itemsToDisplay.length - 1;
          const sidebarItem: SidebarItemData | undefined = itemsToDisplay[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
                padding: "0.25rem 0.5rem",
              }}
            >
              {isLoaderRow || !sidebarItem ? (
                <SidebarItemSkeleton />
              ) : (
                <SidebarItem
                  item={sidebarItem.entry}
                  matchIndices={sidebarItem.matchIndices}
                  variant={contextConfig.variant}
                />
              )}
            </div>
          );
        })}
      </div>

      {loading && itemsToDisplay.length > 0 && (
        <div className="flex justify-center p-4">
          <div className="animate-pulse text-sm text-muted-foreground">
            Loading more {contextConfig.label.toLowerCase()}...
          </div>
        </div>
      )}
    </div>
  );
});

SidebarList.displayName = "SidebarList";

import React from "react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useSidebarContext } from "./SidebarContext";
import { useAppStore } from "@/store/appStore";
import { Archive, Loader2 } from "lucide-react";

export const SidebarFooter = React.memo(() => {
  const { itemsToDisplay, totalCount, loading } = useSidebarData();
  const searchQuery = useAppStore((s) => s.searchQuery);
  const { contextConfig } = useSidebarContext();

  const displayedCount = itemsToDisplay.length;
  const hasMoreItems = displayedCount < totalCount;

  const getStatusText = () => {
    if (searchQuery) {
      return totalCount === 0
        ? `No ${contextConfig.label.toLowerCase()} found`
        : totalCount === 1
        ? `1 ${contextConfig.label.slice(0, -1).toLowerCase()} found`
        : `${displayedCount} of ${totalCount} ${contextConfig.label.toLowerCase()} found`;
    }
    if (totalCount === 0) return `No ${contextConfig.label.toLowerCase()} available`;
    if (totalCount === 1) return `1 ${contextConfig.label.slice(0, -1).toLowerCase()}`;
    return hasMoreItems
      ? `${displayedCount} of ${totalCount} ${contextConfig.label.toLowerCase()}`
      : `${totalCount} ${contextConfig.label.toLowerCase()}`;
  };

  const showLoadingIndicator = loading && hasMoreItems && displayedCount > 0;

  return (
    <footer
      className="p-4 text-center text-sm text-muted-foreground border-t border-rune/30"
      role="contentinfo"
      aria-label="Content status"
    >
      <div className="flex items-center justify-center gap-2 font-serif">
        {loading && displayedCount > 0 ? (
          <Loader2 className="w-4 h-4 text-rune animate-spin" />
        ) : (
          <Archive className="w-4 h-4 text-rune" />
        )}
        <span aria-live="polite" aria-atomic="true">
          {getStatusText()}
        </span>
      </div>

      {showLoadingIndicator && (
        <div className="mt-2 text-xs text-muted-foreground/80 animate-pulse">Loading more...</div>
      )}

      {hasMoreItems && totalCount > 100 && (
        <div className="mt-2">
          <div className="w-full bg-border rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-rune/60 transition-all duration-300 ease-out"
              style={{ width: `${Math.min((displayedCount / totalCount) * 100, 100)}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="sr-only">
            Loaded {Math.round((displayedCount / totalCount) * 100)}% of{" "}
            {contextConfig.label.toLowerCase()}
          </div>
        </div>
      )}
    </footer>
  );
});

SidebarFooter.displayName = "SidebarFooter";

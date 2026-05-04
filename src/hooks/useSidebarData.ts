import { useRef, useMemo, useEffect, useCallback, useDeferredValue } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore, useCurrentEntriesMap, useCurrentCount } from "@/store/appStore";
import { findMatchIndices } from "@/lib/search";
import { TIMING } from "@/lib/dnd/constants";
import type { BestiaryEntry } from "@/types";

export interface SidebarItem {
  entry: BestiaryEntry;
  /** Match indices for highlighting [start, end][] */
  matchIndices: [number, number][];
}

export function useSidebarData() {
  const parentRef = useRef<HTMLDivElement>(null);
  const currentContext = useAppStore((s) => s.currentContext);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const fetchPage = useAppStore((s) => s.fetchPage);
  const isLoading = useAppStore((s) => s.isLoading);
  const entriesMap = useCurrentEntriesMap();
  const totalCount = useCurrentCount();

  // fetchPage handles stale request detection via fetchVersion
  useEffect(() => {
    let isCancelled = false;

    const delay = searchQuery.trim()
      ? TIMING.SEARCH_DEBOUNCE
      : TIMING.CONTEXT_SWITCH_DEBOUNCE;
    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        void fetchPage(currentContext, true);
      }
    }, delay);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [currentContext, fetchPage, searchQuery]);

  const entriesList = useMemo(() => [...entriesMap.values()], [entriesMap]);

  // Filter and sort items with fuzzy search.
  // Uses deferredSearchQuery so this computation runs at transition priority,
  // keeping the search input responsive while the list catches up.
  const filteredItems = useMemo((): SidebarItem[] => {
    if (!deferredSearchQuery.trim()) {
      // Backend results are already ordered for the current context/search.
      return entriesList.map((entry) => ({ entry, matchIndices: [] }));
    }

    // While the debounced backend search is in flight, the store may still hold
    // rows from the previous query. Filter locally so stale unrelated rows do
    // not briefly masquerade as search results.
    return entriesList
      .map((entry) => ({
        entry,
        matchIndices: findMatchIndices(entry.name, deferredSearchQuery),
      }))
      .filter((item) => item.matchIndices.length > 0);
  }, [entriesList, deferredSearchQuery]);

  const hasMore = filteredItems.length < totalCount;

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? filteredItems.length + 1 : filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Load more when scrolling near the end (only when not searching)
  const loadMoreIfNeeded = useCallback(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem || isLoading || !hasMore) return;
    if (lastItem.index >= filteredItems.length - 1) {
      void fetchPage(currentContext, false);
    }
  }, [rowVirtualizer, isLoading, hasMore, filteredItems.length, fetchPage, currentContext]);

  useEffect(() => {
    loadMoreIfNeeded();
  }, [loadMoreIfNeeded]);

  return {
    parentRef,
    loading: isLoading,
    itemsToDisplay: filteredItems,
    rowVirtualizer,
    totalCount,
    searchQuery,
  };
}

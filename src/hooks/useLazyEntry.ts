import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import type { BestiaryEntry, ViewContext } from "@/types";

type FetchFn = (type: ViewContext, id: string) => Promise<BestiaryEntry>;

/**
 * Reads an entry from the store immediately; falls back to a one-shot fetch
 * when `enabled` becomes true and the entry isn't already cached locally.
 * The fetch guard is a ref so triggering the fetch never causes a render.
 */
export function useLazyEntry(
  type: ViewContext,
  id: string,
  fetchFn: FetchFn,
  enabled: boolean
): { data: BestiaryEntry | null; isLoading: boolean } {
  const storedData = useAppStore((s) => s.data[type].entries.get(id) ?? null);
  const [fetchedData, setFetchedData] = useState<BestiaryEntry | null>(null);
  const [fetchDone, setFetchDone] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!enabled || storedData || fetchingRef.current) return;
    fetchingRef.current = true;
    let cancelled = false;
    fetchFn(type, id)
      .then((entry) => { if (!cancelled) setFetchedData(entry); })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetchDone(true);
        fetchingRef.current = false;
      });
    return () => { cancelled = true; };
  }, [enabled, id, type, storedData, fetchFn]);

  return {
    data: storedData ?? fetchedData,
    isLoading: !storedData && !fetchedData && !fetchDone,
  };
}

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Given a list of entity IDs and the in-memory map they resolve through, ensure
 * any missing entries are loaded and return the resolved entries plus the ids
 * that are still missing after the load attempt.
 *
 * Centralizes the "section of an entity's referenced collection" pattern
 * (abilities, items, statuses, etc.) so each section doesn't reimplement the
 * load-on-mount + filter-known dance.
 */
export function useLoadedReferences<T>(
  ids: readonly string[],
  map: ReadonlyMap<string, T>,
  ensureLoaded: (ids: string[]) => Promise<void>,
): { entries: T[]; missingIds: string[]; loading: boolean; error: Error | null } {
  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;

  const idsFingerprint = useMemo(() => [...new Set(ids)].sort().join("\0"), [ids]);

  // Stable, deduplicated id list. Loot rows allow the same itemId in multiple
  // rows; we still want one load + one entry per unique id.
  const uniqueIds = useMemo(
    () => (idsFingerprint === "" ? [] : idsFingerprint.split("\0")),
    [idsFingerprint],
  );

  const uniqueIdsRef = useRef(uniqueIds);
  uniqueIdsRef.current = uniqueIds;

  const [loading, setLoading] = useState(() => uniqueIds.length > 0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const list = uniqueIdsRef.current;
    if (list.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void ensureLoadedRef
      .current([...list])
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [idsFingerprint]);

  const entries = useMemo(
    () => uniqueIds.map((id) => map.get(id)).filter((e): e is T => e !== undefined),
    [uniqueIds, map],
  );

  const missingIds = useMemo(
    () => uniqueIds.filter((id) => !map.has(id)),
    [uniqueIds, map],
  );

  return { entries, missingIds, loading, error };
}

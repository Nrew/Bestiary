import React from "react";
import { getContextConfig } from "@/lib/context-config";
import { useEntriesMapByContext } from "@/store/appStore";
import type { ViewContext } from "@/types";

export type ReferencedEntryName =
  | { status: "loading"; name: string }
  | { status: "found"; name: string }
  | { status: "missing"; name: string };

type FetchedEntryName = {
  context: ViewContext;
  id: string;
  status: "loading" | "found" | "missing";
  name: string;
};

export function useReferencedEntryName(
  context: ViewContext,
  id: string
): ReferencedEntryName {
  const entriesMap = useEntriesMapByContext(context);
  const storedName = entriesMap.get(id)?.name ?? null;
  const [fetched, setFetched] = React.useState<FetchedEntryName | null>(null);
  const fetchedForCurrent =
    fetched?.context === context && fetched.id === id ? fetched : null;
  const hasFetchedCurrent = fetchedForCurrent !== null;

  React.useEffect(() => {
    if (!id || storedName !== null || hasFetchedCurrent) return;

    let cancelled = false;
    setFetched({ context, id, status: "loading", name: "..." });

    void getContextConfig(context)
      .api.getDetails(id)
      .then((entry) => {
        if (!cancelled) {
          setFetched({ context, id, status: "found", name: entry.name });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetched({ context, id, status: "missing", name: "" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [context, id, storedName, hasFetchedCurrent]);

  if (storedName !== null) {
    return { status: "found", name: storedName };
  }

  if (fetchedForCurrent) {
    return {
      status: fetchedForCurrent.status,
      name: fetchedForCurrent.name,
    };
  }

  return { status: "loading", name: "..." };
}

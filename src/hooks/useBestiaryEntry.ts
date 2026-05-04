import { useAppStore, useEntityCount, useItemCount, useStatusCount, useAbilityCount } from "@/store/appStore";
import type { BestiaryEntry, ViewContext } from "@/types";

export const useBestiaryEntry = (entryType: ViewContext, entryId: string | null) => {
  const data = useAppStore((s) => (entryId ? s.data[entryType].entries.get(entryId) : null));
  const isLoading = useAppStore((s) => s.isLoading);
  return { data: data ?? null, isLoading: !data && isLoading };
};

export const useAllEntriesForType = (entryType: ViewContext): BestiaryEntry[] => {
  const entries = useAppStore((s) => s.data[entryType].entries);
  return Array.from(entries.values());
};

export const useBestiaryStats = () => {
  const entities = useEntityCount();
  const items = useItemCount();
  const statuses = useStatusCount();
  const abilities = useAbilityCount();

  return {
    entities,
    items,
    statuses,
    abilities,
    total: entities + items + statuses + abilities,
  };
};

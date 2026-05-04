import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import type {
  Entity,
  Item,
  Status,
  Ability,
  GameEnums,
  ViewContext,
  BestiaryEntry,
} from "@/types";
import type { NameLookupMap } from "@/components/shared/wiki-link/WikiLinkExtension";
import { createDefaultEntry } from "@/lib/dnd/factories";
import { formatErrorMessage, isNotFoundError } from "@/lib/errors";
import { getLogger } from "@/lib/logger";
import { getContextConfig } from "@/lib/context-config";
import { getGameEnums } from "@/lib/api";
import { useMemo } from "react";
import { PAGE_SIZE } from "@/lib/dnd/constants";
import { buildWikiNameLookup } from "@/lib/wikiNameLookup";
import { scheduleIdle } from "@/lib/idle";

enableMapSet();

const log = getLogger("appStore");

type EntryMap = Map<string, BestiaryEntry>;

interface ContextData {
  entries: EntryMap;
  count: number;
}

interface AppState {
  currentContext: ViewContext;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedId: string | null;
  editOnSelect: boolean;
  gameEnums: GameEnums | null;
  // Version counter to prevent race conditions in async fetches
  fetchVersion: number;
  savingEntries: Set<string>;
  // Track if the current entry has unsaved changes (for navigation warning)
  hasUnsavedChanges: boolean;
  // Incremented on any name-affecting change; wiki link rendering subscribes to this
  nameVersion: number;
  isCreatingEntry: boolean;
  // Entries created locally but not yet persisted.
  draftEntries: Set<string>;
  data: Record<ViewContext, ContextData>;
}

interface AppActions {
  // UI State
  setCurrentContext: (context: ViewContext) => void;
  setSearchQuery: (query: string) => void;
  setSelectedId: (id: string | null, edit?: boolean) => void;
  clearEditOnSelect: () => void;
  setError: (error: string | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;

  initialize: (preloadedEnums?: GameEnums) => Promise<void>;

  saveEntry: <T extends BestiaryEntry>(context: ViewContext, entry: T) => Promise<T>;
  deleteEntry: (context: ViewContext, id: string) => Promise<void>;
  mergeEntries: (context: ViewContext, entries: BestiaryEntry[], clear?: boolean) => void;
  setCount: (context: ViewContext, count: number) => void;

  createNewEntry: (context: ViewContext) => Promise<void>;
  discardDraftEntry: (context: ViewContext, id: string) => void;
  fetchPage: (context: ViewContext, isNew?: boolean) => Promise<void>;
  navigateToEntry: (context: ViewContext, id: string) => Promise<void>;

  // Convenience typed accessors (for components that need specific types)
  getEntry: <T extends BestiaryEntry>(context: ViewContext, id: string) => T | undefined;
  getEntriesMap: (context: ViewContext) => EntryMap;

  // Cross-context helpers (for loading referenced entries like items in loot tables)
  ensureItemsLoaded: (itemIds: string[]) => Promise<void>;
  ensureAbilitiesLoaded: (abilityIds: string[]) => Promise<void>;
}

const createInitialData = (): Record<ViewContext, ContextData> => ({
  entities: { entries: new Map(), count: 0 },
  items: { entries: new Map(), count: 0 },
  statuses: { entries: new Map(), count: 0 },
  abilities: { entries: new Map(), count: 0 },
});

export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => {
    const ensureEntriesLoaded = async (context: ViewContext, ids: string[]) => {
      const entriesMap = get().data[context].entries;
      const missingIds = Array.from(new Set(ids.filter((id) => id && !entriesMap.has(id))));

      if (missingIds.length === 0) return;

      const config = getContextConfig(context);
      const fetchedEntries = await Promise.all(
        missingIds.map(async (id) => {
          try {
            return await config.api.getDetails(id);
          } catch (err) {
            if (!isNotFoundError(err)) {
              log.warn(`ensureEntriesLoaded: unexpected error fetching ${context}`, id, err);
            }
            return null;
          }
        })
      );

      const validEntries = fetchedEntries.filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null
      );

      if (validEntries.length === 0) return;

      set((state) => {
        let added = false;
        validEntries.forEach((entry) => {
          if (!state.data[context].entries.has(entry.id)) added = true;
          state.data[context].entries.set(entry.id, entry);
        });
        if (added) state.nameVersion += 1;
      });
    };

    return {
    currentContext: "entities",
    isLoading: true,
    error: null,
    searchQuery: "",
    selectedId: null,
    editOnSelect: false,
    gameEnums: null,
    fetchVersion: 0,
    savingEntries: new Set(),
    hasUnsavedChanges: false,
    nameVersion: 0,
    isCreatingEntry: false,
    draftEntries: new Set(),
    data: createInitialData(),

    setCurrentContext: (context) =>
      set((state) => {
        // Drafts are context-local; discard the selected draft before leaving it.
        const oldCtx = state.currentContext;
        if (state.selectedId && state.draftEntries.has(state.selectedId)) {
          const draftId = state.selectedId;
          state.draftEntries.delete(draftId);
          state.data[oldCtx].entries.delete(draftId);
          state.selectedId = null;
        }
        state.fetchVersion += 1;
        state.currentContext = context;
        state.searchQuery = "";
        state.hasUnsavedChanges = false;
        state.error = null;
        state.isLoading = false;
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.fetchVersion += 1;
        state.searchQuery = query;
        state.error = null;
      }),

    setSelectedId: (id, edit = false) =>
      set((state) => {
        state.selectedId = id;
        state.editOnSelect = edit;
      }),

    clearEditOnSelect: () =>
      set((state) => {
        state.editOnSelect = false;
      }),

    setError: (error) => set({ error }),

    setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

    initialize: async (preloadedEnums?: GameEnums) => {
      try {
        const enums = preloadedEnums ?? await getGameEnums();
        set({ gameEnums: enums, isLoading: false, error: null });

        // Snapshot fetchVersion so stale preload results are discarded if the user
        // navigates or searches before all four context fetches complete.
        const contexts: ViewContext[] = ["entities", "items", "statuses", "abilities"];
        const preloadVersion = get().fetchVersion;
        const runWikiWarmup = () => {
          void Promise.all(
            contexts.map(async (ctx) => {
              if (get().data[ctx].entries.size > 0) return null;
              const config = getContextConfig(ctx);
              try {
                const [entries, count] = await Promise.all([
                  config.api.search("", PAGE_SIZE, 0),
                  config.api.count(""),
                ]);
                if (get().fetchVersion !== preloadVersion) return null;
                return { ctx, entries, count };
              } catch (err) {
                log.debug("Wiki preload skipped for context", ctx, err);
                return null;
              }
            })
          ).then((results) => {
            const loaded = results.filter(
              (r): r is NonNullable<typeof r> => r !== null
            );
            if (loaded.length === 0) return;
            const hasAny = loaded.some((r) => r.entries.length > 0);
            set((state) => {
              for (const { ctx, entries, count } of loaded) {
                entries.forEach((e) => state.data[ctx].entries.set(e.id, e));
                state.data[ctx].count = count;
              }
              if (hasAny) state.nameVersion += 1;
            });
          });
        };

        scheduleIdle(runWikiWarmup, 2_000);
      } catch (err) {
        const message = formatErrorMessage("Initialization failed", err);
        set({ error: message, isLoading: false });
        throw err;
      }
    },

    saveEntry: async (context, entry) => {
      const config = getContextConfig(context);

      // Prevent concurrent saves of the same entry
      if (get().savingEntries.has(entry.id)) {
        throw new Error(`Entry ${entry.id} is already being saved`);
      }

      set((state) => {
        state.savingEntries.add(entry.id);
      });

      try {
        // Race the save against a 30s timeout so a hung IPC can't leave the entry
        // permanently stuck in savingEntries.
        const saveWithTimeout = Promise.race([
          config.api.save(entry),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Save timed out after 30 seconds")), 30_000)
          ),
        ]);
        const saved = await saveWithTimeout;
        set((state) => {
          const data = state.data[context];
          const existing = data.entries.get(entry.id);
          const isDraft = state.draftEntries.has(entry.id);
          const isNew = !existing;
          const shouldIncrementCount = isNew || isDraft;
          const nameChanged = !!existing && existing.name !== saved.name;
          data.entries.set(saved.id, saved);
          // Defensive: backend currently mirrors the submitted UUID, but guard
          // against a future implementation that reassigns the ID on insert.
          if (entry.id !== saved.id) {
            data.entries.delete(entry.id);
            if (state.selectedId === entry.id) {
              state.selectedId = saved.id;
            }
          }
          if (shouldIncrementCount) {
            data.count += 1;
          }
          if (isDraft) {
            state.draftEntries.delete(entry.id);
          }
          // Skip for stat-only saves; only new entries or name changes need the wiki map rebuilt
          if (shouldIncrementCount || nameChanged) {
            state.nameVersion += 1;
          }
          state.error = null;
          state.savingEntries.delete(entry.id);
        });
        return saved as typeof entry;
      } catch (err) {
        const message = formatErrorMessage(`Failed to save ${config.label.toLowerCase()}`, err);
        set((state) => {
          state.savingEntries.delete(entry.id);
          state.error = message;
        });
        throw err;
      }
    },

    deleteEntry: async (context, id) => {
      const config = getContextConfig(context);
      try {
        const isDraft = get().draftEntries.has(id);
        if (!isDraft) {
          await config.api.delete(id);
        }
        set((state) => {
          const data = state.data[context];
          state.draftEntries.delete(id);
          data.entries.delete(id);
          if (!isDraft) {
            data.count = Math.max(0, data.count - 1);
          }
          if (state.selectedId === id) {
            state.selectedId = null;
          }
          state.nameVersion += 1;
          state.error = null;
        });
      } catch (err) {
        const message = formatErrorMessage(`Failed to delete ${config.label.toLowerCase()}`, err);
        set({ error: message });
        throw err;
      }
    },

    mergeEntries: (context, entries, clear = false) =>
      set((state) => {
        const data = state.data[context];
        if (clear) {
          // Preserve the selected entry so useSelectionValidation doesn't clear
          // selection while a fetch is in-flight
          const sid = state.selectedId;
          const pinned = sid ? data.entries.get(sid) : undefined;
          data.entries.clear();
          if (pinned) data.entries.set(pinned.id, pinned);
        }
        let added = false;
        entries.forEach((e) => {
          if (!data.entries.has(e.id)) added = true;
          data.entries.set(e.id, e);
        });
        // `useMemoizedNameLookup` subscribes only to `nameVersion`, so it must
        // be told when fresh entries arrive (paginated fetch, search results,
        // ensureItemsLoaded). Without this bump a wiki link to an entry not
        // present at first render would stay broken until the user saved
        // something. Skip the bump if `clear` was set without adding new IDs
        // and no pre-existing IDs were re-merged with name changes; those
        // cases either don't change the lookup or are already covered.
        if (added) {
          state.nameVersion += 1;
        }
      }),

    setCount: (context, count) =>
      set((state) => {
        state.data[context].count = count;
      }),

    createNewEntry: (context) => {
      if (get().isCreatingEntry) {
        return Promise.resolve();
      }

      set({ isCreatingEntry: true });
      const { setSearchQuery, setSelectedId, setError } = get();
      const config = getContextConfig(context);

      try {
        const newEntry = createDefaultEntry(context);
        set((state) => {
          state.data[context].entries.set(newEntry.id, newEntry);
          // `count` tracks backend rows and is used to drive pagination `hasMore`;
          // a local draft is not yet persisted. The sidebar still shows the draft
          // because it reads from `entries`, not `count`.
          state.draftEntries.add(newEntry.id);
          state.nameVersion += 1;
        });
        setSearchQuery("");
        setSelectedId(newEntry.id, true);
      } catch (error) {
        const message = formatErrorMessage(`Failed to create ${config.label.toLowerCase()}`, error);
        setError(message);
        throw error;
      } finally {
        set({ isCreatingEntry: false });
      }
      return Promise.resolve();
    },

    discardDraftEntry: (context, id) =>
      set((state) => {
        if (!state.draftEntries.has(id)) return;
        state.draftEntries.delete(id);
        state.data[context].entries.delete(id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
        state.nameVersion += 1;
      }),

    fetchPage: async (context, isNew = false) => {
      const { searchQuery, isLoading, setError, mergeEntries, setCount, fetchVersion } = get();
      const config = getContextConfig(context);

      if (isLoading) return;

      const requestVersion = fetchVersion;
      set({ isLoading: true });

      try {
        const currentData = get().data[context];
        const offset = isNew ? 0 : currentData.entries.size;
        const resultsPromise = config.api.search(searchQuery, PAGE_SIZE, offset);
        const countPromise = isNew ? config.api.count(searchQuery) : Promise.resolve(undefined);
        const [results, count] = await Promise.all([resultsPromise, countPromise]);

        if (get().fetchVersion !== requestVersion) return;

        mergeEntries(context, results, isNew);

        if (isNew && count !== undefined) {
          setCount(context, count);
        }
      } catch (error) {
        if (get().fetchVersion === requestVersion) {
          const message = formatErrorMessage(`Failed to load ${config.pluralLabel.toLowerCase()}`, error);
          setError(message);
        }
      } finally {
        if (get().fetchVersion === requestVersion) {
          set({ isLoading: false });
        }
      }
    },

    getEntry: <T extends BestiaryEntry>(context: ViewContext, id: string): T | undefined => {
      return get().data[context].entries.get(id) as T | undefined;
    },

    getEntriesMap: (context) => {
      return get().data[context].entries;
    },

    ensureItemsLoaded: (itemIds: string[]) => ensureEntriesLoaded("items", itemIds),

    ensureAbilitiesLoaded: (abilityIds: string[]) =>
      ensureEntriesLoaded("abilities", abilityIds),

    navigateToEntry: async (context, id) => {
      if (get().data[context].entries.has(id)) {
        get().setCurrentContext(context);
        get().setSelectedId(id);
        return;
      }

      const config = getContextConfig(context);
      try {
        const entry = await config.api.getDetails(id);
        set((state) => {
          state.data[context].entries.set(entry.id, entry);
        });
      } catch (err) {
        const message = formatErrorMessage("Failed to navigate to entry", err);
        set((state) => {
          state.error = message;
        });
        return;
      }

      get().setCurrentContext(context);
      get().setSelectedId(id);
    },
    };
  })
);

export const useGameEnums = () => useAppStore((s) => s.gameEnums);
export const useCurrentContext = () => useAppStore((s) => s.currentContext);
export const useSelectedId = () => useAppStore((s) => s.selectedId);
export const useIsLoading = () => useAppStore((s) => s.isLoading);
export const useError = () => useAppStore((s) => s.error);
export const useHasUnsavedChanges = () => useAppStore((s) => s.hasUnsavedChanges);

export const useCurrentEntriesMap = () =>
  useAppStore((s) => s.data[s.currentContext].entries);

export const useCurrentCount = () =>
  useAppStore((s) => s.data[s.currentContext].count);

/**
 * Get the current entry by ID from the current context.
 * Returns null if ID is null/not provided, undefined if entry doesn't exist.
 * This distinction allows consumers to differentiate "no ID provided" from "ID not found".
 */
export const useCurrentEntry = (id: string | null): BestiaryEntry | null | undefined =>
  useAppStore((s) => (id === null ? null : s.data[s.currentContext].entries.get(id)));

/**
 * Get an entity by ID.
 * Returns null if ID is null, undefined if entity doesn't exist.
 */
export const useEntity = (id: string | null): Entity | null | undefined =>
  useAppStore((s) => (id === null ? null : s.data.entities.entries.get(id) as Entity | undefined));

/**
 * Get an item by ID.
 * Returns null if ID is null, undefined if item doesn't exist.
 */
export const useItem = (id: string | null): Item | null | undefined =>
  useAppStore((s) => (id === null ? null : s.data.items.entries.get(id) as Item | undefined));

/**
 * Get a status by ID.
 * Returns null if ID is null, undefined if status doesn't exist.
 */
export const useStatus = (id: string | null): Status | null | undefined =>
  useAppStore((s) => (id === null ? null : s.data.statuses.entries.get(id) as Status | undefined));

/**
 * Get an ability by ID.
 * Returns null if ID is null, undefined if ability doesn't exist.
 */
export const useAbility = (id: string | null): Ability | null | undefined =>
  useAppStore((s) => (id === null ? null : s.data.abilities.entries.get(id) as Ability | undefined));

export const useEntitiesMap = () => useAppStore(useShallow((s) => s.data.entities.entries));
export const useItemsMap = () => useAppStore(useShallow((s) => s.data.items.entries));
export const useStatusesMap = () => useAppStore(useShallow((s) => s.data.statuses.entries));
export const useAbilitiesMap = () => useAppStore(useShallow((s) => s.data.abilities.entries));

export const useEntriesMapByContext = (context: ViewContext) =>
  useAppStore(useShallow((s) => s.data[context].entries));

// Count selectors
export const useEntityCount = () => useAppStore((s) => s.data.entities.count);
export const useItemCount = () => useAppStore((s) => s.data.items.count);
export const useStatusCount = () => useAppStore((s) => s.data.statuses.count);
export const useAbilityCount = () => useAppStore((s) => s.data.abilities.count);

/**
 * Memoized name lookup for wiki links.
 *
 * Subscribes ONLY to `nameVersion` so unrelated store mutations (saves that
 * don't change a name, isLoading flips, fetchVersion bumps, …) do not rebuild
 * the map and cascade rerenders into every consumer (RichTextViewer in 5
 * view sections + every form's RichTextEditor). Name-affecting events
 * (initial preload, new entry, save with renamed, delete, draft create/
 * discard, mergeEntries) increment `nameVersion`, which is sufficient.
 *
 * `data` is read imperatively inside the memo via `useAppStore.getState()`
 * so we capture the current snapshot at recompute time without subscribing
 * to its reference churn.
 */
export const useMemoizedNameLookup = (): NameLookupMap => {
  const nameVersion = useAppStore((s) => s.nameVersion);

  return useMemo(() => {
    const { entities, items, statuses, abilities } = useAppStore.getState().data;
    return buildWikiNameLookup({
      entities: entities.entries,
      items: items.entries,
      statuses: statuses.entries,
      abilities: abilities.entries,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- imperative read, gated by nameVersion
  }, [nameVersion]);
};

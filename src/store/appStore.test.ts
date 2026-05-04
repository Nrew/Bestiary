import { describe, expect, it, beforeEach, vi } from "vitest";
import type { Item } from "@/types";
import { isItem } from "@/lib/type-guards";

const apiMocks = vi.hoisted(() => {
  const saveItem = vi.fn();
  const baseApi = {
    search: vi.fn(async (_query: string, _limit: number, _offset: number): Promise<unknown[]> => []),
    count: vi.fn(async () => 0),
    getDetails: vi.fn(),
    delete: vi.fn(),
  };

  return {
    saveItem,
    entityApi: { ...baseApi, save: vi.fn() },
    itemApi: { ...baseApi, save: saveItem },
    statusApi: { ...baseApi, save: vi.fn() },
    abilityApi: { ...baseApi, save: vi.fn() },
    getGameEnums: vi.fn(),
  };
});

vi.mock("@/lib/api", () => apiMocks);

const { useAppStore } = await import("./appStore");

const createItem = (name: string): Item => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name,
  slug: "test-item",
  type: "trinket",
  description: "",
  icon: "entity/trinket",
  weight: null,
  bulk: null,
  rarity: null,
  properties: {},
  equipSlots: [],
  statModifiers: {},
  durability: null,
  createdAt: "2026-04-24T00:00:00.000Z",
  updatedAt: "2026-04-24T00:00:00.000Z",
});

const requireSelectedId = (): string => {
  const selectedId = useAppStore.getState().selectedId;
  expect(selectedId).not.toBeNull();
  return selectedId ?? "";
};

const requireStoredItem = (id: string): Item => {
  const item = useAppStore.getState().data.items.entries.get(id);
  expect(isItem(item)).toBe(true);
  if (!isItem(item)) throw new Error(`Expected item ${id} to exist in the store`);
  return item;
};

describe("appStore saveEntry", () => {
  beforeEach(() => {
    apiMocks.saveItem.mockReset();
    useAppStore.setState({
      data: {
        entities: { entries: new Map(), count: 0 },
        items: {
          entries: new Map([["550e8400-e29b-41d4-a716-446655440000", createItem("Old Name")]]),
          count: 1,
        },
        statuses: { entries: new Map(), count: 0 },
        abilities: { entries: new Map(), count: 0 },
      },
      nameVersion: 0,
      savingEntries: new Set(),
      draftEntries: new Set(),
      error: null,
      isCreatingEntry: false,
      selectedId: null,
      searchQuery: "",
    });
  });

  it("increments nameVersion when an existing entry is renamed", async () => {
    const renamed = createItem("New Name");
    apiMocks.saveItem.mockResolvedValue(renamed);

    await useAppStore.getState().saveEntry("items", renamed);

    expect(useAppStore.getState().nameVersion).toBe(1);
  });

  it("does not increment nameVersion for existing entries when the name is unchanged", async () => {
    const unchanged = createItem("Old Name");
    apiMocks.saveItem.mockResolvedValue(unchanged);

    await useAppStore.getState().saveEntry("items", unchanged);

    expect(useAppStore.getState().nameVersion).toBe(0);
  });

  it("creates a local draft without saving a placeholder record", async () => {
    await useAppStore.getState().createNewEntry("items");

    const state = useAppStore.getState();
    expect(apiMocks.saveItem).not.toHaveBeenCalled();
    const selectedId = requireSelectedId();
    expect(state.draftEntries.has(selectedId)).toBe(true);
    expect(state.data.items.entries.has(selectedId)).toBe(true);
  });

  it("discards an unsaved draft entry", async () => {
    await useAppStore.getState().createNewEntry("items");
    const draftId = requireSelectedId();

    useAppStore.getState().discardDraftEntry("items", draftId);

    const state = useAppStore.getState();
    expect(state.draftEntries.has(draftId)).toBe(false);
    expect(state.data.items.entries.has(draftId)).toBe(false);
    expect(state.selectedId).toBeNull();
  });

  it("saves a draft and clears its draft marker", async () => {
    await useAppStore.getState().createNewEntry("items");
    const draftId = requireSelectedId();
    const draft = requireStoredItem(draftId);
    const initialCount = useAppStore.getState().data.items.count;
    apiMocks.saveItem.mockResolvedValue(draft);

    await useAppStore.getState().saveEntry("items", draft);

    expect(apiMocks.saveItem).toHaveBeenCalledWith(draft);
    expect(useAppStore.getState().draftEntries.has(draftId)).toBe(false);
    expect(useAppStore.getState().data.items.count).toBe(initialCount + 1);
  });


  it("discards draft when context switches away with draft selected", async () => {
    // Reflect real UX: currentContext is 'items', user creates a draft, then
    // switches. setCurrentContext's draft-cleanup path deletes the draft from
    // the OLD context's map (the one the user is leaving).
    useAppStore.setState({ currentContext: "items" });

    await useAppStore.getState().createNewEntry("items");
    const draftId = requireSelectedId();
    expect(useAppStore.getState().draftEntries.has(draftId)).toBe(true);
    expect(useAppStore.getState().data.items.entries.has(draftId)).toBe(true);

    // Switch away; orphaned draft in 'items' should be discarded.
    useAppStore.getState().setCurrentContext("entities");

    const state = useAppStore.getState();
    expect(state.draftEntries.has(draftId)).toBe(false);
    expect(state.data.items.entries.has(draftId)).toBe(false);
    expect(state.selectedId).toBeNull();
  });

  it("updates selectedId when backend returns a different ID than draft ID", async () => {
    // Simulate the backend assigning its own ID on insert (e.g., autoincrement
    // or server-generated UUID). The store must follow the selection to the
    // backend ID and drop the stale draft key so no ghost row remains.
    await useAppStore.getState().createNewEntry("items");
    const draftId = requireSelectedId();
    const draft = requireStoredItem(draftId);
    expect(useAppStore.getState().draftEntries.has(draftId)).toBe(true);

    const backendId = `backend-assigned-id-${Date.now()}`;
    const persisted: Item = { ...draft, id: backendId };
    apiMocks.saveItem.mockResolvedValue(persisted);

    await useAppStore.getState().saveEntry("items", draft);

    const state = useAppStore.getState();
    // Stale draft key must be gone
    expect(state.draftEntries.has(draftId)).toBe(false);
    expect(state.data.items.entries.has(draftId)).toBe(false);
    // Real backend row is present under its assigned ID
    expect(state.data.items.entries.has(backendId)).toBe(true);
    // Selection followed to the backend ID
    expect(state.selectedId).toBe(backendId);
  });

  it("does not increment backend count when creating a draft", async () => {
    const initialCount = useAppStore.getState().data.items.count;
    await useAppStore.getState().createNewEntry("items");

    // count reflects backend rows only; drafts must not bump it.
    expect(useAppStore.getState().data.items.count).toBe(initialCount);
    // Sanity: the draft IS in the entries map (sidebar reads from here).
    const draftId = requireSelectedId();
    expect(useAppStore.getState().data.items.entries.has(draftId)).toBe(true);
  });

  it("does not decrement backend count when deleting an unsaved draft", async () => {
    const initialCount = useAppStore.getState().data.items.count;
    await useAppStore.getState().createNewEntry("items");
    const draftId = requireSelectedId();

    await useAppStore.getState().deleteEntry("items", draftId);

    expect(useAppStore.getState().data.items.count).toBe(initialCount);
    expect(useAppStore.getState().draftEntries.has(draftId)).toBe(false);
    expect(useAppStore.getState().data.items.entries.has(draftId)).toBe(false);
  });

  it("bumps nameVersion after preload completes", async () => {
    // Reset fetchVersion and nameVersion, then install a search mock that
    // returns a non-empty result so the preload branch bumps nameVersion.
    useAppStore.setState({ nameVersion: 0, fetchVersion: 0 });
    const initialVersion = useAppStore.getState().nameVersion;

    // NOTE: Because the per-context apis are spread from a shared `baseApi`
    // object in the hoisted mock, `apiMocks.entityApi.search` and
    // `apiMocks.itemApi.search` reference the SAME vi.fn. One mockResolvedValue
    // therefore covers all four preload searches. We return one seeded entry
    // so `loadedAny` becomes true inside initialize()'s preload callback.
    const seeded = createItem("Preloaded Item");
    apiMocks.itemApi.search.mockResolvedValue([seeded]);
    apiMocks.getGameEnums.mockResolvedValueOnce({
      itemTypes: [],
      rarities: [],
      abilityTypes: [],
      aoeShapes: [],
      damageTypes: [],
      entitySizes: [],
      threatLevels: [],
      attributes: [],
      resistanceLevels: [],
    });

    // Clear the items map so the preload's "entries.size > 0" short-circuit
    // doesn't skip it. (immer middleware lets us mutate in-place.)
    useAppStore.setState((s) => {
      s.data.items.entries.clear();
    });

    await useAppStore.getState().initialize();

    // The preload is fire-and-forget; the nameVersion bump happens AFTER
    // all 4 context searches AND their count queries settle. Flush the event
    // loop enough times that every awaited microtask inside Promise.all + the
    // trailing .then() has a chance to run.
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(useAppStore.getState().nameVersion).toBeGreaterThan(initialVersion);
  });

  it("increments nameVersion when ensureItemsLoaded adds missing entries", async () => {
    const loadedItem = createItem("Loaded Item");
    apiMocks.itemApi.getDetails.mockResolvedValueOnce(loadedItem);
    useAppStore.setState({
      nameVersion: 0,
      data: {
        entities: { entries: new Map(), count: 0 },
        items: { entries: new Map(), count: 0 },
        statuses: { entries: new Map(), count: 0 },
        abilities: { entries: new Map(), count: 0 },
      },
    });

    await useAppStore.getState().ensureItemsLoaded([loadedItem.id]);

    expect(useAppStore.getState().data.items.entries.get(loadedItem.id)).toEqual(loadedItem);
    expect(useAppStore.getState().nameVersion).toBe(1);
  });

  it("deduplicates repeated ids when ensuring referenced items are loaded", async () => {
    const loadedItem = createItem("Loaded Item");
    apiMocks.itemApi.getDetails.mockClear();
    apiMocks.itemApi.getDetails.mockResolvedValue(loadedItem);
    useAppStore.setState({
      data: {
        entities: { entries: new Map(), count: 0 },
        items: { entries: new Map(), count: 0 },
        statuses: { entries: new Map(), count: 0 },
        abilities: { entries: new Map(), count: 0 },
      },
    });

    await useAppStore.getState().ensureItemsLoaded([loadedItem.id, loadedItem.id]);

    expect(apiMocks.itemApi.getDetails).toHaveBeenCalledTimes(1);
  });
});

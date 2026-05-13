import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";

const confirmSpy = vi.fn<(options: unknown) => Promise<boolean>>();

vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: () => ({
    confirm: confirmSpy,
    confirmState: { open: false, title: "", description: "" },
    handleConfirm: () => {},
    handleCancel: () => {},
  }),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/lib/api", () => {
  const baseApi = {
    search: vi.fn(async () => [] as unknown[]),
    count: vi.fn(async () => 0),
    getDetails: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };
  return {
    entityApi: { ...baseApi },
    itemApi: { ...baseApi },
    statusApi: { ...baseApi },
    abilityApi: { ...baseApi },
    getGameEnums: vi.fn(),
  };
});

// Zustand v5 wires `getServerSnapshot` to `getInitialState`, so SSR selectors
// always see the initial state regardless of `setState`. Bypass that for the
// hook test by reading current state on every selector call.
vi.mock("@/store/appStore", async () => {
  const actual =
    await vi.importActual<typeof import("@/store/appStore")>("@/store/appStore");
  const api = actual.useAppStore;
  type StoreState = ReturnType<typeof api.getState>;
  const useAppStore = Object.assign(
    <T,>(selector: (s: StoreState) => T): T => selector(api.getState()),
    api,
  );
  return {
    ...actual,
    useAppStore,
    useHasUnsavedChanges: () => api.getState().hasUnsavedChanges,
  };
});

const { useAppStore } = await import("@/store/appStore");
const { NavigationGuardProvider, useNavigationGuard } = await import("./useNavigationGuard");

type Guard = ReturnType<typeof useNavigationGuard>;

function probeGuard(): Guard {
  let captured: Guard | null = null;
  const Probe: React.FC = () => {
    captured = useNavigationGuard();
    return null;
  };
  renderToStaticMarkup(
    <NavigationGuardProvider>
      <Probe />
    </NavigationGuardProvider>,
  );
  if (!captured) throw new Error("Probe did not render");
  return captured;
}

function setGuardState(hasUnsavedChanges: boolean, savingIds: string[]) {
  useAppStore.setState((s) => {
    s.hasUnsavedChanges = hasUnsavedChanges;
    s.savingEntries = new Set(savingIds);
  });
}

describe("useNavigationGuard.confirmNavigation", () => {
  beforeEach(() => {
    confirmSpy.mockReset();
    confirmSpy.mockResolvedValue(true);
    setGuardState(false, []);
  });

  it("allows navigation when nothing is saving and no unsaved changes", async () => {
    const guard = probeGuard();
    await expect(guard.confirmNavigation()).resolves.toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("allows navigation while a save is in flight if no unsaved edits remain", async () => {
    setGuardState(false, ["pending"]);
    const guard = probeGuard();
    await expect(guard.confirmNavigation()).resolves.toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("blocks navigation when a save is in flight AND there are still unsaved edits", async () => {
    setGuardState(true, ["pending"]);
    confirmSpy.mockResolvedValueOnce(true);
    const guard = probeGuard();
    const result = await guard.confirmNavigation();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Save In Progress" }),
    );
    expect(result).toBe(false);
  });

  it("asks 'Unsaved Changes' when there are unsaved edits but no save is in flight", async () => {
    setGuardState(true, []);
    confirmSpy.mockResolvedValueOnce(false);
    const guard = probeGuard();
    const result = await guard.confirmNavigation();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Unsaved Changes",
        destructive: true,
        confirmLabel: "Leave",
        cancelLabel: "Stay",
      }),
    );
    expect(result).toBe(false);
  });

  it("forwards the user's 'Leave' choice when unsaved changes are confirmed", async () => {
    setGuardState(true, []);
    confirmSpy.mockResolvedValueOnce(true);
    const guard = probeGuard();
    await expect(guard.confirmNavigation()).resolves.toBe(true);
  });
});

describe("useNavigationGuard outside provider", () => {
  it("throws a clear error when used without NavigationGuardProvider", () => {
    const Bad: React.FC = () => {
      useNavigationGuard();
      return null;
    };
    // React logs the thrown error during SSR; suppress to keep output clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderToStaticMarkup(<Bad />)).toThrow(
      /must be used within NavigationGuardProvider/i,
    );
    spy.mockRestore();
  });
});

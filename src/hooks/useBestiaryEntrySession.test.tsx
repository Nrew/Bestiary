import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React, { useRef } from "react";
import { useForm } from "react-hook-form";
import type { BestiaryEntry, Item } from "@/types";

const confirmSpy = vi.fn<(options: unknown) => Promise<boolean>>();
const setHasUnsavedChangesSpy = vi.fn<(v: boolean) => void>();

vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: () => ({
    confirm: confirmSpy,
    confirmState: { open: false, title: "", description: "" },
    handleConfirm: () => {},
    handleCancel: () => {},
  }),
}));

vi.mock("@/lib/keyboard-shortcuts", () => ({
  useKeyboardShortcut: () => {},
  APP_SHORTCUTS: {
    SAVE: { key: "s", description: "Save" },
    ESCAPE: { key: "Escape", description: "Cancel" },
  },
}));

vi.mock("@/store/appStore", () => ({
  useAppStore: <T,>(selector: (s: { setHasUnsavedChanges: (v: boolean) => void }) => T): T =>
    selector({ setHasUnsavedChanges: setHasUnsavedChangesSpy }),
}));

const { useBestiaryEntrySession } = await import("./useBestiaryEntrySession");

const createItem = (overrides: Partial<Item> = {}): Item => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Old Name",
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
  createdAt: "2026-05-09T00:00:00.000Z",
  updatedAt: "2026-05-09T00:00:00.000Z",
  ...overrides,
});

type Session = ReturnType<typeof useBestiaryEntrySession>;

function probeSession(
  baseline: BestiaryEntry,
  opts: { editOnSelect?: boolean } = {},
): Session {
  let captured: Session | null = null;
  const Probe: React.FC = () => {
    const form = useForm<BestiaryEntry>({ defaultValues: baseline });
    const formRef = useRef<HTMLFormElement>(null);
    captured = useBestiaryEntrySession({
      baseline,
      form,
      formRef,
      editOnSelect: opts.editOnSelect ?? false,
      clearEditOnSelect: () => {},
    });
    return null;
  };
  renderToStaticMarkup(<Probe />);
  if (!captured) throw new Error("Probe did not render");
  return captured;
}

describe("useBestiaryEntrySession", () => {
  beforeEach(() => {
    confirmSpy.mockReset();
    confirmSpy.mockResolvedValue(true);
    setHasUnsavedChangesSpy.mockReset();
  });

  it("starts in view mode by default", () => {
    const session = probeSession(createItem());
    expect(session.mode).toBe("view");
  });

  it("exposes the full session API", () => {
    const session = probeSession(createItem());
    expect(typeof session.openEdit).toBe("function");
    expect(typeof session.enterView).toBe("function");
    expect(typeof session.confirmDiscardEdit).toBe("function");
    expect(typeof session.finalizeDiscard).toBe("function");
    expect(typeof session.handleConfirmDialogConfirm).toBe("function");
    expect(typeof session.handleConfirmDialogCancel).toBe("function");
    expect(session.confirmState.open).toBe(false);
  });

  it("exposes the baseline unchanged", () => {
    const baseline = createItem({ name: "Specific Baseline" });
    const session = probeSession(baseline);
    expect(session.baseline).toBe(baseline);
  });

  it("confirmDiscardEdit short-circuits to true without a dialog when not dirty", async () => {
    const session = probeSession(createItem());
    await expect(session.confirmDiscardEdit()).resolves.toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("finalizeDiscard is a no-op when no discard is pending", () => {
    const session = probeSession(createItem());
    // Should not throw and should not perform a form.reset side effect.
    expect(() => session.finalizeDiscard()).not.toThrow();
  });

  it("clears unsavedChanges state when confirmDiscardEdit succeeds on a clean form", async () => {
    const session = probeSession(createItem());
    setHasUnsavedChangesSpy.mockClear();
    await session.confirmDiscardEdit();
    // clearUnsavedTracking() runs synchronously inside the discard path and
    // notifies the store; we verify the spy received `false`.
    expect(setHasUnsavedChangesSpy).toHaveBeenCalledWith(false);
  });
});

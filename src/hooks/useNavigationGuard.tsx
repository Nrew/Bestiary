import React, { createContext, useCallback, useEffect, use, startTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { useLatestRef } from "@/hooks/useLatestRef";
import {
  useAppStore,
  useCanGoBack,
  useCanGoForward,
  useHasUnsavedChanges,
} from "@/store/appStore";
import { APP_SHORTCUTS, useKeyboardShortcut } from "@/lib/keyboard-shortcuts";
import type { ViewContext } from "@/types";

interface NavigationGuardValue {
  confirmNavigation: () => Promise<boolean>;
  navigateToEntry: (context: ViewContext, id: string, edit?: boolean) => Promise<boolean>;
  changeContext: (context: ViewContext) => Promise<boolean>;
  createEntry: (context: ViewContext) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  goBackTo: (historyIndex: number) => Promise<boolean>;
  canGoBack: boolean;
  canGoForward: boolean;
}

const NavigationGuardContext = createContext<NavigationGuardValue | null>(null);

export function NavigationGuardProvider({ children }: React.PropsWithChildren) {
  const hasUnsavedChanges = useHasUnsavedChanges();
  const currentContext = useAppStore((s) => s.currentContext);
  const selectedContext = useAppStore((s) => s.selectedContext);
  const selectedId = useAppStore((s) => s.selectedId);
  const setCurrentContext = useAppStore((s) => s.setCurrentContext);
  const navigateStoreToEntry = useAppStore((s) => s.navigateToEntry);
  const createNewEntry = useAppStore((s) => s.createNewEntry);
  const goBackInStore = useAppStore((s) => s.goBack);
  const goForwardInStore = useAppStore((s) => s.goForward);
  const goBackToInStore = useAppStore((s) => s.goBackTo);
  const canGoBack = useCanGoBack();
  const canGoForward = useCanGoForward();
  const savingCount = useAppStore((s) => s.savingEntries.size);
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const confirmNavigation = useCallback(async () => {
    // A save is in-flight. If there are no unsaved changes, the save already captured
    // everything the user cared about; navigation can proceed while the IPC settles
    // in the background. If there ARE still unsaved changes on top of the in-flight
    // save, block and tell the user to wait rather than risk losing those edits.
    if (savingCount > 0) {
      if (!hasUnsavedChanges) {
        return true;
      }
      await confirm({
        title: "Save In Progress",
        description: "A save is currently in progress. Please wait for it to complete before navigating.",
        confirmLabel: "OK",
        cancelLabel: "OK",
      });
      return false;
    }

    if (!hasUnsavedChanges) {
      return true;
    }

    return confirm({
      title: "Unsaved Changes",
      description: "You have unsaved changes. Are you sure you want to leave without saving?",
      confirmLabel: "Leave",
      cancelLabel: "Stay",
      destructive: true,
    });
  }, [confirm, hasUnsavedChanges, savingCount]);

  const navigateToEntry = useCallback(
    async (context: ViewContext, id: string, edit = false) => {
      const isSameEntry = context === selectedContext && id === selectedId && !edit;
      if (!isSameEntry && !(await confirmNavigation())) {
        return false;
      }

      startTransition(() => { void navigateStoreToEntry(context, id, edit); });
      return true;
    },
    [confirmNavigation, selectedContext, navigateStoreToEntry, selectedId]
  );

  const changeContext = useCallback(
    async (context: ViewContext) => {
      if (context === currentContext) {
        return true;
      }

      if (!(await confirmNavigation())) {
        return false;
      }

      startTransition(() => { setCurrentContext(context); });
      return true;
    },
    [confirmNavigation, currentContext, setCurrentContext]
  );

  const createEntry = useCallback(
    async (context: ViewContext) => {
      if (!(await confirmNavigation())) {
        return false;
      }

      await createNewEntry(context);
      return true;
    },
    [confirmNavigation, createNewEntry]
  );

  const goBack = useCallback(async () => {
    if (!canGoBack) return false;
    if (!(await confirmNavigation())) return false;
    startTransition(() => { void goBackInStore(); });
    return true;
  }, [canGoBack, confirmNavigation, goBackInStore]);

  const goForward = useCallback(async () => {
    if (!canGoForward) return false;
    if (!(await confirmNavigation())) return false;
    startTransition(() => { void goForwardInStore(); });
    return true;
  }, [canGoForward, confirmNavigation, goForwardInStore]);

  const goBackTo = useCallback(
    async (historyIndex: number) => {
      if (!canGoBack) return false;
      if (!(await confirmNavigation())) return false;
      startTransition(() => { void goBackToInStore(historyIndex); });
      return true;
    },
    [canGoBack, confirmNavigation, goBackToInStore],
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.NAV_BACK,
    useCallback(() => { void goBack(); }, [goBack]),
    {
      allowInEditable: true,
      description: "Back in entry history",
      enabled: canGoBack,
    },
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.NAV_FORWARD,
    useCallback(() => { void goForward(); }, [goForward]),
    {
      allowInEditable: true,
      description: "Forward in entry history",
      enabled: canGoForward,
    },
  );

  // Hold the latest handlers in refs so the window listener attaches once on
  // mount rather than re-attaching on every history-state change.
  const goBackRef = useLatestRef(goBack);
  const goForwardRef = useLatestRef(goForward);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.defaultPrevented) return;
      if (event.button === 3) {
        event.preventDefault();
        void goBackRef.current();
      } else if (event.button === 4) {
        event.preventDefault();
        void goForwardRef.current();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [goBackRef, goForwardRef]);

  const value = React.useMemo(
    () => ({
      confirmNavigation,
      navigateToEntry,
      changeContext,
      createEntry,
      goBack,
      goForward,
      goBackTo,
      canGoBack,
      canGoForward,
    }),
    [
      canGoBack,
      canGoForward,
      changeContext,
      confirmNavigation,
      createEntry,
      goBack,
      goBackTo,
      goForward,
      navigateToEntry,
    ],
  );

  return (
    <NavigationGuardContext value={value}>
      {children}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        destructive={confirmState.destructive}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </NavigationGuardContext>
  );
}

export function useNavigationGuard(): NavigationGuardValue {
  const context = use(NavigationGuardContext);
  if (!context) {
    throw new Error("useNavigationGuard must be used within NavigationGuardProvider");
  }
  return context;
}

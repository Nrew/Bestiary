import React, { createContext, useCallback, useContext, startTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { useAppStore, useHasUnsavedChanges } from "@/store/appStore";
import type { ViewContext } from "@/types";

interface NavigationGuardValue {
  confirmNavigation: () => Promise<boolean>;
  navigateToEntry: (context: ViewContext, id: string, edit?: boolean) => Promise<boolean>;
  changeContext: (context: ViewContext) => Promise<boolean>;
  createEntry: (context: ViewContext) => Promise<boolean>;
}

const NavigationGuardContext = createContext<NavigationGuardValue | null>(null);

export const NavigationGuardProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const hasUnsavedChanges = useHasUnsavedChanges();
  const currentContext = useAppStore((s) => s.currentContext);
  const selectedId = useAppStore((s) => s.selectedId);
  const setCurrentContext = useAppStore((s) => s.setCurrentContext);
  const navigateStoreToEntry = useAppStore((s) => s.navigateToEntry);
  const createNewEntry = useAppStore((s) => s.createNewEntry);
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
      const isSameEntry = context === currentContext && id === selectedId && !edit;
      if (!isSameEntry && !(await confirmNavigation())) {
        return false;
      }

      startTransition(() => {
        void navigateStoreToEntry(context, id);
        if (edit) useAppStore.getState().setSelectedId(id, true);
      });
      return true;
    },
    [confirmNavigation, currentContext, navigateStoreToEntry, selectedId]
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

  const value = React.useMemo(
    () => ({ confirmNavigation, navigateToEntry, changeContext, createEntry }),
    [changeContext, confirmNavigation, createEntry, navigateToEntry]
  );

  return (
    <NavigationGuardContext.Provider value={value}>
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
    </NavigationGuardContext.Provider>
  );
};

export function useNavigationGuard(): NavigationGuardValue {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error("useNavigationGuard must be used within NavigationGuardProvider");
  }
  return context;
}

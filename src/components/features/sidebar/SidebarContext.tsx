import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { CONTEXT_CONFIG, type SidebarContextConfig } from "./constants";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import type { ViewContext } from "@/types";

interface SidebarContextValue {
  isOpen: boolean;
  currentContext: ViewContext;
  selectedId: string | null;

  onClose: () => void;
  onItemClick: (id: string, edit?: boolean) => void;
  onDeleteRequest: (id: string, name: string) => void;

  contextConfig: SidebarContextConfig;

  deleteState: { id: string; name: string } | null;
  setDeleteState: (state: { id: string; name: string } | null) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  isOpen,
  onClose,
}) => {
  const currentContext = useAppStore((s) => s.currentContext);
  const selectedId = useAppStore((s) => s.selectedId);
  const { navigateToEntry } = useNavigationGuard();

  const [deleteState, setDeleteState] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleItemClick = useCallback(
    async (id: string, edit: boolean = false) => {
      const didNavigate = await navigateToEntry(currentContext, id, edit);
      if (!didNavigate) {
        return;
      }

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      onClose();
    },
    [currentContext, navigateToEntry, onClose]
  );

  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteState({ id, name });
  }, []);

  const contextConfig = useMemo(
    () => CONTEXT_CONFIG[currentContext],
    [currentContext]
  );

  const value = useMemo(
    () => ({
      isOpen,
      currentContext,
      selectedId,
      onClose,
      onItemClick: handleItemClick,
      onDeleteRequest: handleDeleteRequest,
      contextConfig,
      deleteState,
      setDeleteState,
    }),
    [
      isOpen,
      currentContext,
      selectedId,
      onClose,
      handleItemClick,
      handleDeleteRequest,
      contextConfig,
      deleteState,
    ]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error(
      "useSidebarContext must be used within a SidebarProvider. " +
      "Make sure to wrap your component with <SidebarProvider>."
    );
  }
  return context;
};

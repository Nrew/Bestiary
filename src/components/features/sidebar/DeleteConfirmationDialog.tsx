import React, { useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { useSidebarContext } from "./SidebarContext";
import { ERROR_MESSAGES } from "./constants";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

// Thin wrapper over ConfirmDialog pre-configured for entry deletion.
export const DeleteConfirmationDialog = React.memo(() => {
  const { deleteState, setDeleteState, currentContext } = useSidebarContext();
  const setError = useAppStore((s) => s.setError);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const deleteEntry = useAppStore((s) => s.deleteEntry);

  const executeDelete = useCallback(async () => {
    if (!deleteState) return;

    try {
      await deleteEntry(currentContext, deleteState.id);

      if (useAppStore.getState().selectedId === deleteState.id) {
        setSelectedId(null);
      }
    } catch {
      setError(ERROR_MESSAGES.DELETE_FAILED);
    } finally {
      setDeleteState(null);
    }
  }, [deleteState, currentContext, deleteEntry, setError, setSelectedId, setDeleteState]);

  const handleCancel = useCallback(() => {
    setDeleteState(null);
  }, [setDeleteState]);

  if (!deleteState) return null;

  return (
    <ConfirmDialog
      open={!!deleteState}
      destructive
      title={
        <>
          <Trash2 className="w-5 h-5" aria-hidden="true" />
          Delete Entry?
        </>
      }
      description={
        <>
          Are you sure you want to permanently delete{" "}
          <span className="font-semibold text-foreground">
            &quot;{deleteState.name}&quot;
          </span>
          ? This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      cancelLabel="Cancel"
      confirmIcon={<Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />}
      contentClassName="border-2 border-destructive/60 animate-scale-in motion-reduce:animate-none"
      titleClassName="font-display text-destructive text-lg flex items-center gap-2"
      descriptionClassName="font-serif leading-relaxed"
      onConfirm={() => {
        void executeDelete();
      }}
      onCancel={handleCancel}
    />
  );
});

DeleteConfirmationDialog.displayName = "DeleteConfirmationDialog";

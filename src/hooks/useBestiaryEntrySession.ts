import { useCallback, useRef, type RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useConfirm } from "@/hooks/useConfirm";
import {
  useEntrySessionMode,
  type EntryEditMode,
} from "@/hooks/useEntrySessionMode";
import { useExternalEntryUpdate } from "@/hooks/useExternalEntryUpdate";
import { useLatestRef } from "@/hooks/useLatestRef";
import { useKeyboardShortcut, APP_SHORTCUTS } from "@/lib/keyboard-shortcuts";
import type { BestiaryEntry } from "@/types";

export type { EntryEditMode };

export interface UseBestiaryEntrySessionOptions {
  /** Canonical entry from the store; `form.reset(baseline)` reverts edits. */
  baseline: BestiaryEntry;
  form: UseFormReturn<BestiaryEntry>;
  formRef: RefObject<HTMLFormElement | null>;
  editOnSelect: boolean;
  clearEditOnSelect: () => void;
}

export interface BestiaryEntrySession {
  baseline: BestiaryEntry;
  mode: EntryEditMode;
  form: UseFormReturn<BestiaryEntry>;
  formRef: RefObject<HTMLFormElement | null>;
  openEdit: () => void;
  enterView: () => void;
  /** Discard guard + reset working copy to `baseline` + return to view when confirmed. */
  confirmDiscardEdit: () => Promise<boolean>;
  /** Called by `AnimatePresence.onExitComplete` after the edit pane unmounts. */
  finalizeDiscard: () => void;
  confirmState: ReturnType<typeof useConfirm>["confirmState"];
  handleConfirmDialogConfirm: () => void;
  handleConfirmDialogCancel: () => void;
}

export function useBestiaryEntrySession({
  baseline,
  form,
  formRef,
  editOnSelect,
  clearEditOnSelect,
}: UseBestiaryEntrySessionOptions): BestiaryEntrySession {
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const {
    mode,
    setMode,
    openEdit,
    enterView,
    isDirtyRef,
    clearUnsavedTracking,
  } = useEntrySessionMode(form);

  const pendingDiscardResetRef = useRef(false);

  useExternalEntryUpdate({
    baseline,
    form,
    mode,
    setMode,
    isDirtyRef,
    editOnSelect,
    clearEditOnSelect,
    confirm,
    clearUnsavedTracking,
  });

  const confirmDiscardEdit = useCallback(async (): Promise<boolean> => {
    if (isDirtyRef.current) {
      const confirmed = await confirm({
        title: "Discard Changes?",
        description: "You have unsaved changes. Are you sure you want to discard them?",
        confirmLabel: "Discard",
        cancelLabel: "Keep Editing",
        destructive: true,
      });
      if (!confirmed) return false;
      // form.reset fires a subscriber cascade across every useWatch in the
      // form. Defer it to `finalizeDiscard`, which runs after the edit pane
      // unmounts so the cascade hits an empty subscriber list.
      pendingDiscardResetRef.current = true;
    }
    clearUnsavedTracking();
    enterView();
    return true;
  }, [confirm, enterView, clearUnsavedTracking, isDirtyRef]);

  const finalizeDiscard = useCallback(() => {
    if (!pendingDiscardResetRef.current) return;
    pendingDiscardResetRef.current = false;
    form.reset(baseline);
  }, [form, baseline]);

  const isSubmittingRef = useLatestRef(form.formState.isSubmitting);

  useKeyboardShortcut(
    APP_SHORTCUTS.SAVE,
    () => {
      if (isDirtyRef.current && !isSubmittingRef.current) {
        formRef.current?.requestSubmit();
      }
    },
    { description: "Save entry", enabled: mode === "edit" },
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.ESCAPE,
    () => { void confirmDiscardEdit(); },
    { description: "Cancel edit", enabled: mode === "edit" },
  );

  return {
    baseline,
    mode,
    form,
    formRef,
    openEdit,
    enterView,
    confirmDiscardEdit,
    finalizeDiscard,
    confirmState,
    handleConfirmDialogConfirm: handleConfirm,
    handleConfirmDialogCancel: handleCancel,
  };
}

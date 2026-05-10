import React, { useEffect, useRef, useCallback, useState, useMemo, startTransition } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useAppStore } from "@/store/appStore";
import { useKeyboardShortcut, APP_SHORTCUTS } from "@/lib/keyboard-shortcuts";
import type { BestiaryEntry } from "@/types";
import { useConfirm } from "@/hooks/useConfirm";

type FormData = BestiaryEntry;

interface UseEntryFormManagerOptions {
  entry: BestiaryEntry;
  form: UseFormReturn<FormData>;
  formRef: React.RefObject<HTMLFormElement | null>;
  editOnSelect: boolean;
  clearEditOnSelect: () => void;
}

interface EntryFormManagerState {
  mode: "view" | "edit";
  animationKey: number;
  handleModeChange: (newMode: "view" | "edit") => void;
  confirmCancelEdit: () => Promise<boolean>;
  confirmState: ReturnType<typeof useConfirm>["confirmState"];
  handleConfirmDialogConfirm: () => void;
  handleConfirmDialogCancel: () => void;
}

/**
 * Manages view/edit mode, dirty-state tracking, keyboard shortcuts (Ctrl+S / Escape),
 * and cross-entry navigation guards for a bestiary entry form.
 */
export function useEntryFormManager({
  entry,
  form,
  formRef,
  editOnSelect,
  clearEditOnSelect,
}: UseEntryFormManagerOptions): EntryFormManagerState {
  const setHasUnsavedChanges = useAppStore((s) => s.setHasUnsavedChanges);
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [animationKey, setAnimationKey] = useState(0);
  const prevEntryIdRef = useRef(entry.id);
  const prevEntryRef = useRef(entry);

  // Track the latest `entry` prop so async dialog callbacks don't operate on a
  // stale closure value. Also track mount state so we don't call setState on an
  // unmounted component if the user confirms the dialog after navigating away.
  const modeRef = useRef<"view" | "edit">("view");
  const isDirtyRef = useRef(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return form.subscribe({
      formState: {
        isDirty: true,
      },
      callback: ({ isDirty }) => {
        if (typeof isDirty === "boolean") {
          isDirtyRef.current = isDirty;
        }
        setHasUnsavedChanges(modeRef.current === "edit" && isDirtyRef.current);
      },
    });
  }, [form, setHasUnsavedChanges]);

  useEffect(() => {
    modeRef.current = mode;
    if (mode !== "edit") setHasUnsavedChanges(false);
  }, [mode, setHasUnsavedChanges]);


  const handleModeChange = useCallback((newMode: "view" | "edit") => {
    startTransition(() => {
      setAnimationKey((k) => k + 1);
      setMode(newMode);
    });
  }, []);

  /**
   * Cancel editing with confirmation if there are unsaved changes.
   * Returns true if cancelled, false if user chose to stay.
   */
  const confirmCancelEdit = useCallback(async (): Promise<boolean> => {
    if (isDirtyRef.current) {
      const confirmed = await confirm({
        title: "Discard Changes?",
        description: "You have unsaved changes. Are you sure you want to discard them?",
        confirmLabel: "Discard",
        cancelLabel: "Keep Editing",
        destructive: true,
      });
      if (!confirmed) return false;
    }
    form.reset(entry);
    isDirtyRef.current = false;
    setHasUnsavedChanges(false);
    handleModeChange("view");
    return true;
  }, [form, entry, setHasUnsavedChanges, handleModeChange, confirm]);

  useEffect(() => {
    const entryChanged = prevEntryIdRef.current !== entry.id;
    prevEntryIdRef.current = entry.id;

    // Only reset form if:
    // 1. Entry ID changed (navigated to different entry)
    // 2. OR entry content changed AND form is not dirty (external update while viewing)
    // 3. OR editOnSelect is triggered (new entry creation)
    const shouldReset =
      entryChanged ||
      editOnSelect ||
      (!isDirtyRef.current && entry !== prevEntryRef.current);

    prevEntryRef.current = entry;

    if (!shouldReset) {
      return;
    }

    // If user has unsaved changes and entry changed, warn them
    if (isDirtyRef.current && entryChanged && mode === "edit") {
      const targetEntry = entry;
      void confirm({
        title: "Entry Changed",
        description: "The entry has changed externally. Your unsaved edits will be lost. Continue?",
        confirmLabel: "Continue",
        destructive: true,
      }).then((confirmed) => {
        if (!isMountedRef.current) return;
        if (!confirmed) return;
        form.reset(targetEntry);
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
        if (editOnSelect) { setMode("edit"); clearEditOnSelect(); }
        else { setMode("view"); }
        setAnimationKey((k) => k + 1);
      });
      return;
    }

    form.reset(entry);
    isDirtyRef.current = false;
    setHasUnsavedChanges(false);

    if (editOnSelect) {
      setMode("edit");
      clearEditOnSelect();
      if (entryChanged) {
        setAnimationKey((k) => k + 1);
      }
    } else if (entryChanged) {
      setMode("view");
      setAnimationKey((k) => k + 1);
    }
  }, [entry, form, editOnSelect, clearEditOnSelect, mode, confirm, setHasUnsavedChanges]);

  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Browser beforeunload guard
  useEffect(() => {
    if (mode !== "edit") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;

      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [mode]);


  const saveShortcutOptions = useMemo(
    () => ({ description: "Save entry", enabled: mode === "edit" }),
    [mode]
  );

  const escapeShortcutOptions = useMemo(
    () => ({ description: "Cancel edit", enabled: mode === "edit" }),
    [mode]
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.SAVE,
    useCallback(() => {
      if (mode === "edit" && isDirtyRef.current && !form.formState.isSubmitting) {
        formRef.current?.requestSubmit();
      }
    }, [mode, form, formRef]),
    saveShortcutOptions
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.ESCAPE,
    useCallback(() => {
      if (mode === "edit") {
        void confirmCancelEdit();
      }
    }, [mode, confirmCancelEdit]),
    escapeShortcutOptions
  );

  return {
    mode,
    animationKey,
    handleModeChange,
    confirmCancelEdit,
    confirmState,
    handleConfirmDialogConfirm: handleConfirm,
    handleConfirmDialogCancel: handleCancel,
  };
}

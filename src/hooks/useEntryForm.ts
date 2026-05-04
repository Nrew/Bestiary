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
  const latestEntryRef = useRef(entry);
  latestEntryRef.current = entry;
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { isSubmitting, isDirty } = form.formState;


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
    if (isDirty) {
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
    handleModeChange("view");
    return true;
  }, [isDirty, form, entry, handleModeChange, confirm]);

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
      (!isDirty && entry !== prevEntryRef.current);

    prevEntryRef.current = entry;

    if (!shouldReset) {
      return;
    }

    // If user has unsaved changes and entry changed, warn them
    if (isDirty && entryChanged && mode === "edit") {
      // Concurrent external update while the form is dirty
      void confirm({
        title: "Entry Changed",
        description: "The entry has changed externally. Your unsaved edits will be lost. Continue?",
        confirmLabel: "Continue",
        destructive: true,
      }).then((confirmed) => {
        // Guard every async state update: the component may have unmounted or the
        // entry may have changed again while the dialog was open.
        if (!isMountedRef.current) return;
        if (!confirmed) return;
        const latestEntry = latestEntryRef.current;
        form.reset(latestEntry);
        if (editOnSelect) { setMode("edit"); clearEditOnSelect(); }
        else { setMode("view"); }
        setAnimationKey((k) => k + 1);
      });
      return;
    }

    form.reset(entry);

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
  }, [entry, form, editOnSelect, clearEditOnSelect, isDirty, mode, confirm]);


  useEffect(() => {
    setHasUnsavedChanges(mode === "edit" && isDirty);
  }, [isDirty, mode, setHasUnsavedChanges]);

  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Browser beforeunload guard
  useEffect(() => {
    if (mode !== "edit") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;

      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [mode, isDirty]);


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
      if (mode === "edit" && isDirty && !isSubmitting) {
        formRef.current?.requestSubmit();
      }
    }, [mode, isDirty, isSubmitting, formRef]),
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

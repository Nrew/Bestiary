import { useCallback, useMemo, type RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useKeyboardShortcut, APP_SHORTCUTS } from "@/lib/keyboard-shortcuts";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { BestiaryEntry } from "@/types";
import type { EntryEditMode } from "./useEntrySessionMode";

export interface UseEntryShortcutsOptions {
  mode: EntryEditMode;
  form: UseFormReturn<BestiaryEntry>;
  formRef: RefObject<HTMLFormElement | null>;
  isDirtyRef: RefObject<boolean>;
  onCancel: () => unknown;
}

export function useEntryShortcuts({
  mode,
  form,
  formRef,
  isDirtyRef,
  onCancel,
}: UseEntryShortcutsOptions): void {
  const isSubmittingRef = useLatestRef(form.formState.isSubmitting);

  const saveOptions = useMemo(
    () => ({ description: "Save entry", enabled: mode === "edit" }),
    [mode],
  );

  const escapeOptions = useMemo(
    () => ({ description: "Cancel edit", enabled: mode === "edit" }),
    [mode],
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.SAVE,
    useCallback(() => {
      if (mode === "edit" && isDirtyRef.current && !isSubmittingRef.current) {
        formRef.current?.requestSubmit();
      }
    }, [mode, formRef, isSubmittingRef, isDirtyRef]),
    saveOptions,
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.ESCAPE,
    useCallback(() => {
      if (mode === "edit") {
        void onCancel();
      }
    }, [mode, onCancel]),
    escapeOptions,
  );
}

import {
  useEffect,
  useRef,
  startTransition,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { useConfirm } from "@/hooks/useConfirm";
import type { BestiaryEntry } from "@/types";
import type { EntryEditMode } from "./useEntrySessionMode";

export interface UseExternalEntryUpdateOptions {
  baseline: BestiaryEntry;
  form: UseFormReturn<BestiaryEntry>;
  mode: EntryEditMode;
  setMode: Dispatch<SetStateAction<EntryEditMode>>;
  isDirtyRef: RefObject<boolean>;
  editOnSelect: boolean;
  clearEditOnSelect: () => void;
  confirm: ReturnType<typeof useConfirm>["confirm"];
  clearUnsavedTracking: () => void;
}

/**
 * Watches the canonical entry and reacts when it changes from under us.
 * Three triggers: a new id (navigation), a sidebar "edit on select" request,
 * or a remote/store mutation while we're not dirty. Dirty edits get a confirm
 * dialog ("Entry Changed") before the local working copy is overwritten.
 */
export function useExternalEntryUpdate({
  baseline,
  form,
  mode,
  setMode,
  isDirtyRef,
  editOnSelect,
  clearEditOnSelect,
  confirm,
  clearUnsavedTracking,
}: UseExternalEntryUpdateOptions): void {
  const prevBaselineIdRef = useRef(baseline.id);
  const prevBaselineRef = useRef(baseline);

  const editOnSelectRef = useLatestRef(editOnSelect);
  const clearEditOnSelectRef = useLatestRef(clearEditOnSelect);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const baselineIdChanged = prevBaselineIdRef.current !== baseline.id;

    const shouldReset =
      baselineIdChanged ||
      editOnSelect ||
      (!isDirtyRef.current && baseline !== prevBaselineRef.current);

    if (!shouldReset) {
      prevBaselineIdRef.current = baseline.id;
      prevBaselineRef.current = baseline;
      return;
    }

    if (isDirtyRef.current && baselineIdChanged && mode === "edit") {
      const targetBaseline = baseline;
      void confirm({
        title: "Entry Changed",
        description:
          "The entry has changed externally. Your unsaved edits will be lost. Continue?",
        confirmLabel: "Continue",
        destructive: true,
      }).then((confirmed) => {
        if (!isMountedRef.current) return;
        prevBaselineIdRef.current = targetBaseline.id;
        prevBaselineRef.current = targetBaseline;
        if (!confirmed) return;
        form.reset(targetBaseline);
        clearUnsavedTracking();
        if (editOnSelectRef.current) {
          clearEditOnSelectRef.current();
          setMode("edit");
        } else {
          setMode("view");
        }
      });
      return;
    }

    prevBaselineIdRef.current = baseline.id;
    prevBaselineRef.current = baseline;
    form.reset(baseline);
    clearUnsavedTracking();

    if (editOnSelect) {
      clearEditOnSelect();
    }

    startTransition(() => {
      if (editOnSelect) {
        setMode("edit");
      } else if (baselineIdChanged) {
        setMode("view");
      }
    });
  }, [
    baseline,
    form,
    editOnSelect,
    clearEditOnSelect,
    mode,
    confirm,
    clearUnsavedTracking,
    isDirtyRef,
    setMode,
    editOnSelectRef,
    clearEditOnSelectRef,
  ]);
}

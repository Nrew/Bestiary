import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import { useAppStore } from "@/store/appStore";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { BestiaryEntry } from "@/types";

export type EntryEditMode = "view" | "edit";

export interface UseEntrySessionModeResult {
  mode: EntryEditMode;
  setMode: Dispatch<SetStateAction<EntryEditMode>>;
  openEdit: () => void;
  enterView: () => void;
  isDirtyRef: RefObject<boolean>;
  modeRef: RefObject<EntryEditMode>;
  /** Resets dirty + unsaved tracking and notifies the store. */
  clearUnsavedTracking: () => void;
}

export function useEntrySessionMode(
  form: UseFormReturn<BestiaryEntry>,
): UseEntrySessionModeResult {
  const setHasUnsavedChanges = useAppStore((s) => s.setHasUnsavedChanges);
  const [mode, setMode] = useState<EntryEditMode>("view");

  const isDirtyRef = useRef(false);
  const lastUnsavedRef = useRef(false);
  const modeRef = useLatestRef(mode);

  useEffect(() => {
    return form.subscribe({
      formState: { isDirty: true },
      callback: ({ isDirty }) => {
        if (typeof isDirty === "boolean") {
          isDirtyRef.current = isDirty;
        }
        const next = modeRef.current === "edit" && isDirtyRef.current;
        if (lastUnsavedRef.current === next) return;
        lastUnsavedRef.current = next;
        setHasUnsavedChanges(next);
      },
    });
  }, [form, setHasUnsavedChanges, modeRef]);

  useEffect(() => {
    if (mode !== "edit") {
      lastUnsavedRef.current = false;
      setHasUnsavedChanges(false);
    }
  }, [mode, setHasUnsavedChanges]);

  useEffect(() => {
    return () => {
      lastUnsavedRef.current = false;
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

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

  const enterView = useCallback(() => {
    startTransition(() => {
      setMode("view");
    });
  }, []);

  const openEdit = useCallback(() => {
    startTransition(() => {
      setMode("edit");
    });
  }, []);

  const clearUnsavedTracking = useCallback(() => {
    isDirtyRef.current = false;
    lastUnsavedRef.current = false;
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  return { mode, setMode, openEdit, enterView, isDirtyRef, modeRef, clearUnsavedTracking };
}

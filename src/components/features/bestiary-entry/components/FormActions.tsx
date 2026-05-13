import { useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { useFormState } from "react-hook-form";
import type { Control, FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormActionsProps<T extends FieldValues> {
  control: Control<T>;
  formId: string;
  onCancel: () => void;
}

export function FormActions<T extends FieldValues>({
  control,
  formId,
  onCancel,
}: FormActionsProps<T>) {
  const { isDirty, isSubmitting } = useFormState({ control });

  // First render returns `false` (the initialValue), React then schedules a
  // deferred re-render at transition priority returning `true`. The CSS
  // transition between data-state="closed" and "open" runs across the two
  // commits.
  const entered = useDeferredValue(true, false);

  return createPortal(
    <div
      data-state={entered ? "open" : "closed"}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col gap-3 p-4 min-w-45",
        "bg-card border border-wine/30 rounded-xl shadow-glass backdrop-blur-sm",
        "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        "data-[state=closed]:opacity-0 data-[state=closed]:translate-x-10",
        "data-[state=open]:opacity-100 data-[state=open]:translate-x-0",
      )}
    >
      {isDirty && (
        <span
          className="text-xs font-serif italic text-warning text-center"
          aria-live="polite"
        >
          Unsaved changes
        </span>
      )}
      <Button
        type="submit"
        form={formId}
        disabled={!isDirty}
        loading={isSubmitting}
        variant="codexPrimary"
        className="w-full justify-center"
      >
        {isSubmitting ? "Saving…" : "Save Entry"}
      </Button>
      <Button
        type="button"
        variant="outlineWine"
        onClick={onCancel}
        disabled={isSubmitting}
        className="w-full"
      >
        {isDirty ? "Discard" : "Cancel"}
      </Button>
    </div>,
    document.body
  );
}

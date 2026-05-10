import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useFormState } from "react-hook-form";
import type { Control, FieldValues } from "react-hook-form";
import { EASE_OUT, DURATION } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface FormActionsProps<T extends FieldValues> {
  control: Control<T>;
  formId: string;
  onCancel: () => void;
}

const panelVariants: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
  exit: { opacity: 0, x: 40, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};

export function FormActions<T extends FieldValues>({
  control,
  formId,
  onCancel,
}: FormActionsProps<T>) {
  const { isDirty, isSubmitting } = useFormState({ control });

  return createPortal(
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 p-4 min-w-45 bg-card border border-[#7a1c1c]/30 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm"
    >
      {isDirty && (
        <span
          className="text-xs font-serif italic text-amber-600 dark:text-amber-400 text-center"
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
        className="btn-save gap-2 w-full justify-center"
      >
        {!isSubmitting && <Save className="w-4 h-4" />}
        {isSubmitting ? "Saving…" : "Save Entry"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={isSubmitting}
        className="w-full justify-center border border-border hover:border-[#7a1c1c] hover:bg-[#7a1c1c]/10 transition-colors"
      >
        {isDirty ? "Discard" : "Cancel"}
      </Button>
    </motion.div>,
    document.body
  );
}

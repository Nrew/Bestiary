import React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmIcon?: React.ReactNode;
  titleIcon?: React.ReactNode;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  confirmClassName?: string;
}

/**
 * Generic confirm dialog built on Radix AlertDialog.
 *
 * Close semantics:
 * - Clicking Confirm fires `onConfirm()` (Radix auto-closes via AlertDialogAction).
 * - Clicking Cancel, pressing Escape, or clicking the overlay fires `onCancel()`
 *   exactly once, via the `onOpenChange(false)` path. We guard against firing
 *   `onCancel` after a confirm by tracking the most recent explicit action.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  confirmIcon,
  titleIcon,
  contentClassName,
  titleClassName,
  descriptionClassName,
  confirmClassName,
}) => {
  // Tracks whether the current close was initiated by Confirm. Radix fires
  // onOpenChange(false) for every close path (Cancel, Escape, overlay, Confirm),
  // so without this flag onCancel would fire after a successful confirm.
  const confirmedRef = React.useRef(false);

  // Reset the flag whenever the dialog opens, so a previous confirm doesn't
  // leak into a fresh open cycle.
  React.useEffect(() => {
    if (open) confirmedRef.current = false;
  }, [open]);

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) return;
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    onCancel();
  }

  function handleConfirm(): void {
    confirmedRef.current = true;
    onConfirm();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className={cn("glass-panel max-w-md rounded-xl", contentClassName)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle
            className={cn(
              "font-display text-xl text-foreground",
              titleIcon && "flex items-center gap-2",
              titleClassName
            )}
          >
            {titleIcon}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            className={cn("mb-2 leading-relaxed", descriptionClassName)}
          >
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={handleConfirm}
              className={cn(
                destructive ? "" : "btn-medieval",
                confirmClassName
              )}
            >
              {confirmIcon}
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

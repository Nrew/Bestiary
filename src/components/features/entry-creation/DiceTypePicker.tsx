import { useCallback, useRef, useState } from "react";
import { motion, useTransform } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTEXT_CONFIG } from "@/components/features/sidebar/constants";
import { APP_SHORTCUTS, formatShortcutKey } from "@/lib/keyboard-shortcuts";
import { ALL_CONTEXTS } from "@/lib/context-config";
import { quatToCSSMatrix, type Quat } from "@/lib/dice/quaternion";
import { cn } from "@/lib/utils";
import type { ViewContext } from "@/types";
import { useDiePhysics } from "./useDiePhysics";
import { DieFace } from "./DieFace";

interface DiceTypePickerProps {
  open: boolean;
  currentContext: ViewContext;
  onOpenChange: (open: boolean) => void;
  onConfirm: (context: ViewContext) => Promise<boolean> | boolean;
}

export function DiceTypePicker({
  open,
  currentContext,
  onOpenChange,
  onConfirm,
}: DiceTypePickerProps) {
  const { qx, qy, qz, qw, selected, prefersReducedMotion, snapTo, onPanStart, onPan, onPanEnd } =
    useDiePhysics(open, currentContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const ok = await onConfirm(selected);
      if (ok) onOpenChange(false);
    } catch {
      /* onConfirm errors are surfaced by the app store; keep dialog open */
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm, onOpenChange, selected]);

  const dieTransform = useTransform([qx, qy, qz, qw], (v) =>
    quatToCSSMatrix([v[0], v[1], v[2], v[3]] as Quat),
  );

  const cfg = CONTEXT_CONFIG[selected];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay-soft backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),36rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl glass-panel p-8 shadow-2xl animate-slide-up focus:outline-none motion-reduce:animate-none"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            confirmBtnRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Choose an entry type</Dialog.Title>
          <Dialog.Description className="sr-only">
            Use Tab to reach the type buttons, then Enter to select. The die
            also rotates by pointer drag or flick.
          </Dialog.Description>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-leather/70">
                New Draft
              </p>
              <h2 className="font-display text-2xl text-foreground">
                What will you scribe?
              </h2>
              <p className="text-xs text-muted-foreground">
                Drag or flick the die ·{" "}
                <kbd className="rounded border border-leather/20 bg-leather/10 px-1.5 py-0.5 font-mono text-xxs text-leather">
                  {formatShortcutKey(APP_SHORTCUTS.NEW)}
                </kbd>
              </p>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isSubmitting}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col items-center gap-5">
            <div
              className="relative mx-auto w-full max-w-104 aspect-5/4 overflow-hidden rounded-2xl bg-linear-to-b from-card/70 via-secondary/30 to-card/60 p-3 shadow-[inset_0_1px_0_var(--color-parchment-20)] ring-1 ring-leather/15"
              style={{ perspective: "1000px", perspectiveOrigin: "50% 25%" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-64 -translate-x-1/2 translate-y-22"
                style={{
                  background: "var(--shadow-die-ground)",
                  filter: "blur(3px)",
                }}
              />
              <motion.div
                className={cn(
                  "absolute inset-0 touch-none select-none",
                  !prefersReducedMotion && "cursor-grab active:cursor-grabbing",
                )}
                onPanStart={onPanStart}
                onPan={onPan}
                onPanEnd={onPanEnd}
                role="img"
                aria-label={`Tetrahedral d4 — ${cfg.label} face is forward.`}
              >
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ transformStyle: "preserve-3d", transform: dieTransform }}
                >
                  {ALL_CONTEXTS.map((ctx, i) => (
                    <DieFace
                      key={ctx}
                      ctx={ctx}
                      faceIndex={i}
                      qx={qx}
                      qy={qy}
                      qz={qz}
                      qw={qw}
                    />
                  ))}
                </motion.div>
              </motion.div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {ALL_CONTEXTS.map((ctx) => {
                const faceCfg = CONTEXT_CONFIG[ctx];
                const FaceIcon = faceCfg.icon;
                const isActive = selected === ctx;
                return (
                  <button
                    key={ctx}
                    type="button"
                    onClick={() => snapTo(ctx)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "border-rune/50 bg-card/80 text-foreground shadow-sm"
                        : "border-leather/20 bg-background/40 text-muted-foreground hover:border-leather/40 hover:text-foreground",
                    )}
                  >
                    <FaceIcon
                      className={cn(
                        "h-4 w-4",
                        isActive ? faceCfg.color : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    {faceCfg.label}
                  </button>
                );
              })}
            </div>

            <p
              className="min-h-10 text-center text-sm text-muted-foreground"
              aria-live="polite"
            >
              {cfg.description}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outlineWine"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              ref={confirmBtnRef}
              onClick={() => void handleConfirm()}
              loading={isSubmitting}
              variant="codexPrimary"
              className="justify-center"
            >
              Create {cfg.label} Draft
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

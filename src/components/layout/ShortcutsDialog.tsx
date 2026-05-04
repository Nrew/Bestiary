import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Keyboard, X } from "lucide-react";
import { keyboardManager, formatShortcutKey } from "@/lib/keyboard-shortcuts";

export const ShortcutsDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const shortcuts = React.useMemo(
    () => open ? keyboardManager.getShortcuts().filter((s) => s.description) : [],
    [open]
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" title="Keyboard shortcuts" className="text-leather hover:text-leather hover:bg-leather/10">
          <Keyboard className="w-5 h-5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[85vh] overflow-y-auto glass-panel p-6 rounded-xl shadow-2xl animate-slide-up focus:outline-none motion-reduce:animate-none">
          <Dialog.Title className="sr-only">Keyboard Shortcuts</Dialog.Title>
          <Dialog.Description className="sr-only">
            Keyboard shortcuts available in the application.
          </Dialog.Description>
          <div className="flex items-center justify-between mb-5">
            <span className="font-display text-2xl text-foreground" aria-hidden="true">Keyboard Shortcuts</span>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close keyboard shortcuts"><X className="w-4 h-4" /></Button>
            </Dialog.Close>
          </div>
          <div className="space-y-1">
            {shortcuts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shortcuts registered.</p>
            ) : (
              shortcuts.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-leather/10 last:border-0">
                  <span className="text-sm text-foreground">{s.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-leather/10 border border-leather/20 rounded text-leather">
                    {formatShortcutKey(s.key)}
                  </kbd>
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

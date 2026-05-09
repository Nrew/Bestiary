import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { headerSlideLeft, headerSlideRight } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { BookOpen, Crown, PlusCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useKeyboardShortcut, APP_SHORTCUTS, formatShortcutKey } from "@/lib/keyboard-shortcuts";
import { DiceTypePicker } from "@/components/features/entry-creation/DiceTypePicker";
import type { ViewContext } from "@/types";

const ShortcutsDialog = React.lazy(() =>
  import("./ShortcutsDialog").then((module) => ({ default: module.ShortcutsDialog }))
);
const SettingsDialog = React.lazy(() =>
  import("./SettingsDialog").then((module) => ({ default: module.SettingsDialog }))
);
const EncounterBuilder = React.lazy(() =>
  import("@/components/features/encounter").then((module) => ({ default: module.EncounterBuilder }))
);

// Search lives in the sidebar; this bar handles navigation and entry creation only.
export const AppHeader: React.FC<{ onTocOpen: () => void }> = ({ onTocOpen }) => {
  const currentContext = useAppStore((s) => s.currentContext);
  const { createEntry } = useNavigationGuard();
  const [isDiceTypePickerOpen, setIsDiceTypePickerOpen] = React.useState(false);

  const handleCreate = useCallback(() => {
    setIsDiceTypePickerOpen(true);
  }, []);

  const handleCreateConfirm = useCallback(
    (context: ViewContext) => createEntry(context),
    [createEntry]
  );

  useKeyboardShortcut(
    APP_SHORTCUTS.NEW,
    handleCreate,
    { description: "Open new entry picker" }
  );

  return (
    <header className="codex-header animate-fade-in-up">
      <motion.div
        className="flex items-center gap-4 md:gap-8"
        variants={headerSlideLeft}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3 text-leather">
          <Crown className="w-8 h-8 flex-none text-rune" />
          <div className="hidden sm:block">
            <h1 className="font-display text-2xl font-bold tracking-wide">
              Bestiary Codex
            </h1>
          </div>
        </div>

        <Button onClick={onTocOpen} className="btn-codex gap-2">
          <BookOpen className="w-4 h-4" />
          Contents
        </Button>
      </motion.div>

      <motion.div
        className="flex items-center gap-2"
        variants={headerSlideRight}
        initial="hidden"
        animate="visible"
      >
        <DiceTypePicker
          open={isDiceTypePickerOpen}
          currentContext={currentContext}
          onOpenChange={setIsDiceTypePickerOpen}
          onConfirm={handleCreateConfirm}
        />
        <React.Suspense fallback={null}>
          <ShortcutsDialog />
          <EncounterBuilder />
          <SettingsDialog />
        </React.Suspense>
        <Button
          onClick={handleCreate}
          className="btn-codex-primary gap-2 px-4 sm:px-6"
          title={`Create new entry (${formatShortcutKey(APP_SHORTCUTS.NEW)})`}
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Scribe New Entry</span>
        </Button>
      </motion.div>
    </header>
  );
};

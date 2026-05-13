import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Crown, Keyboard, PlusCircle, Settings, Swords } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useKeyboardShortcut, APP_SHORTCUTS, formatShortcutKey } from "@/lib/keyboard-shortcuts";
import { DiceTypePicker } from "@/components/features/entry-creation/DiceTypePicker";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import type { ViewContext } from "@/types";

// Each dialog assumes the parent unmounts on close (clears local state).
const ShortcutsDialog = React.lazy(() =>
  import("./ShortcutsDialog").then((module) => ({ default: module.ShortcutsDialog }))
);
const SettingsDialog = React.lazy(() =>
  import("./SettingsDialog").then((module) => ({ default: module.SettingsDialog }))
);
const EncounterBuilder = React.lazy(() =>
  import("@/components/features/encounter").then((module) => ({ default: module.EncounterBuilder }))
);

const NEW_ENTRY_TITLE = `Create new entry (${formatShortcutKey(APP_SHORTCUTS.NEW)})`;

export function AppHeader({ onTocOpen }: { onTocOpen: () => void }) {
  const currentContext = useAppStore((s) => s.currentContext);
  const { createEntry } = useNavigationGuard();
  const [isDiceTypePickerOpen, setIsDiceTypePickerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isEncounterOpen, setIsEncounterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex items-center gap-3 text-leather">
          <Crown className="w-8 h-8 flex-none text-rune" />
          <div className="hidden sm:block">
            <h1 className="font-display text-2xl font-bold tracking-wide">
              Bestiary Codex
            </h1>
          </div>
        </div>

        <Button onClick={onTocOpen} variant="codex">
          <BookOpen className="w-4 h-4" />
          Contents
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghostLeather"
          size="icon"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          aria-haspopup="dialog"
          aria-expanded={isShortcutsOpen}
          onClick={() => setIsShortcutsOpen(true)}
        >
          <Keyboard className="w-5 h-5" />
        </Button>
        <Button
          variant="ghostLeather"
          size="icon"
          aria-label="Encounter Builder"
          title="Encounter Builder"
          aria-haspopup="dialog"
          aria-expanded={isEncounterOpen}
          onClick={() => setIsEncounterOpen(true)}
        >
          <Swords className="w-5 h-5" />
        </Button>
        <Button
          variant="ghostLeather"
          size="icon"
          aria-label="Settings"
          title="Settings"
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleCreate}
          variant="codexPrimary"
          className="px-4 sm:px-6"
          title={NEW_ENTRY_TITLE}
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Scribe New Entry</span>
        </Button>
      </div>

      <DiceTypePicker
        open={isDiceTypePickerOpen}
        currentContext={currentContext}
        onOpenChange={setIsDiceTypePickerOpen}
        onConfirm={handleCreateConfirm}
      />
      <ErrorBoundary level="component">
        <React.Suspense fallback={null}>
          {isShortcutsOpen && (
            <ShortcutsDialog open onOpenChange={setIsShortcutsOpen} />
          )}
          {isEncounterOpen && (
            <EncounterBuilder open onOpenChange={setIsEncounterOpen} />
          )}
          {isSettingsOpen && (
            <SettingsDialog open onOpenChange={setIsSettingsOpen} />
          )}
        </React.Suspense>
      </ErrorBoundary>
    </header>
  );
}

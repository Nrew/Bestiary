import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Crown, Keyboard, PlusCircle, Settings, Swords } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useKeyboardShortcut, APP_SHORTCUTS, formatShortcutKey } from "@/lib/keyboard-shortcuts";
import { DiceTypePicker } from "@/components/features/entry-creation/DiceTypePicker";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { HistoryBookmark } from "@/components/layout/HistoryBookmark";
import { scheduleIdle } from "@/lib/idle";
import type { ViewContext } from "@/types";

// Dialogs reset on close via parent unmount; hover/focus prefetch warms the chunk before click.
const importShortcuts = () => import("./ShortcutsDialog");
const importSettings = () => import("./SettingsDialog");
const importEncounter = () => import("@/components/features/encounter");

const ShortcutsDialog = React.lazy(() => importShortcuts().then((m) => ({ default: m.ShortcutsDialog })));
const SettingsDialog = React.lazy(() => importSettings().then((m) => ({ default: m.SettingsDialog })));
const EncounterBuilder = React.lazy(() => importEncounter().then((m) => ({ default: m.EncounterBuilder })));

const prefetchShortcuts = () => { void importShortcuts(); };
const prefetchSettings = () => { void importSettings(); };
const prefetchEncounter = () => { void importEncounter(); };

const NEW_ENTRY_TITLE = `Create new entry (${formatShortcutKey(APP_SHORTCUTS.NEW)})`;

export function AppHeader({ onTocOpen }: { onTocOpen: () => void }) {
  const currentContext = useAppStore((s) => s.currentContext);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const { createEntry, confirmNavigation } = useNavigationGuard();

  const goHome = useCallback(() => {
    void (async () => {
      if (await confirmNavigation()) setSelectedId(null);
    })();
  }, [confirmNavigation, setSelectedId]);
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

  useEffect(() => scheduleIdle(() => {
    prefetchShortcuts();
    prefetchSettings();
    prefetchEncounter();
  }, 2000), []);

  return (
    <header className="codex-header animate-fade-in-up">
      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex items-center gap-3 text-leather">
          <button
            type="button"
            onClick={goHome}
            aria-label="Go to home"
            title="Home"
            className="flex-none rounded-md transition active:scale-[0.97] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Crown className="w-8 h-8 flex-none text-rune-strong" />
          </button>
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
        <HistoryBookmark />
        <Button
          variant="ghostLeather"
          size="icon"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          aria-haspopup="dialog"
          aria-expanded={isShortcutsOpen}
          onClick={() => setIsShortcutsOpen(true)}
          onMouseEnter={prefetchShortcuts}
          onFocus={prefetchShortcuts}
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
          onMouseEnter={prefetchEncounter}
          onFocus={prefetchEncounter}
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
          onMouseEnter={prefetchSettings}
          onFocus={prefetchSettings}
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

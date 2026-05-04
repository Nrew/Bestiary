export interface KeyboardShortcut {
  /** Key combination (e.g., "ctrl+s", "cmd+shift+p") */
  key: string;
  handler: (e: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
  /** Only active when this element/selector is focused */
  scope?: string;
  enabled?: boolean;
}

interface ParsedShortcut {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
}

function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop() || '';

  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    key: key === 'space' ? ' ' : key,
  };
}

function matchesShortcut(e: KeyboardEvent, parsed: ParsedShortcut): boolean {
  const eventKey = e.key.toLowerCase();

  return (
    e.ctrlKey === parsed.ctrl &&
    e.altKey === parsed.alt &&
    e.shiftKey === parsed.shift &&
    e.metaKey === parsed.meta &&
    eventKey === parsed.key
  );
}

class KeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut & { parsed: ParsedShortcut }> = new Map();
  private enabled = true;
  private boundHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  init(): void {
    document.addEventListener('keydown', this.boundHandler);
  }

  cleanup(): void {
    document.removeEventListener('keydown', this.boundHandler);
    this.shortcuts.clear();
  }

  register(id: string, shortcut: KeyboardShortcut): () => void {
    const parsed = parseShortcut(shortcut.key);
    this.shortcuts.set(id, { ...shortcut, parsed, enabled: shortcut.enabled ?? true });

    return () => this.unregister(id);
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  setEnabled(id: string, enabled: boolean): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }

  setGlobalEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getShortcuts(): Array<{ id: string; key: string; description?: string }> {
    return Array.from(this.shortcuts.entries()).map(([id, shortcut]) => ({
      id,
      key: shortcut.key,
      description: shortcut.description,
    }));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const target = e.target as HTMLElement;
    const isInputFocused =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    for (const [, shortcut] of this.shortcuts) {
      if (!shortcut.enabled) continue;

      if (shortcut.scope) {
        const scopeElement = document.querySelector(shortcut.scope);
        if (!scopeElement?.contains(target)) continue;
      }

      // For most shortcuts, skip if input is focused (unless it's Escape)
      if (isInputFocused && shortcut.parsed.key !== 'escape') {
        // Allow Ctrl/Cmd shortcuts even in inputs
        if (!shortcut.parsed.ctrl && !shortcut.parsed.meta) continue;
      }

      if (matchesShortcut(e, shortcut.parsed)) {
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        shortcut.handler(e);
        return;
      }
    }
  }
}

// Singleton instance
export const keyboardManager = new KeyboardShortcutsManager();

export function initKeyboardManager(): void {
  keyboardManager.init();
}

export function cleanupKeyboardManager(): void {
  keyboardManager.cleanup();
}

/**
 * Note: options are destructured into primitives so the effect dependency array
 * stays stable; passing an object literal directly would re-register on every render.
 */
import { useEffect, useRef } from 'react';

export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: Omit<KeyboardShortcut, 'key' | 'handler'> = {}
): void {
  const { description, preventDefault, scope, enabled = true } = options;

  // Stable ID that persists across re-renders
  const idRef = useRef<string | null>(null);
  if (!idRef.current) {
    idRef.current = `shortcut-${key}-${Math.random().toString(36).slice(2)}`;
  }

  useEffect(() => {
    const id = idRef.current;
    if (!id) return undefined;
    const unregister = keyboardManager.register(id, {
      key,
      handler,
      description,
      preventDefault,
      scope,
      enabled,
    });
    return unregister;
  }, [key, handler, description, preventDefault, scope, enabled]);
}

export function useKeyboardShortcuts(
  shortcuts: Array<{ key: string; handler: (e: KeyboardEvent) => void } & Omit<KeyboardShortcut, 'key' | 'handler'>>
): void {
  useEffect(() => {
    const unregisters = shortcuts.map((shortcut, index) => {
      const id = `shortcut-group-${index}-${shortcut.key}`;
      return keyboardManager.register(id, shortcut);
    });

    return () => {
      unregisters.forEach(unregister => unregister());
    };
  }, [shortcuts]);
}

// DELETE/UNDO/REDO/COPY/PASTE/SELECT_ALL are intentionally absent: registering
// them globally would hijack native text-input and TipTap editing. Wire at the
// component level instead.
export const APP_SHORTCUTS = {
  SAVE: 'ctrl+s',
  NEW: 'ctrl+n',
  SEARCH: 'ctrl+k',
  ESCAPE: 'escape',
} as const;

export function formatShortcutKey(key: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return key
    .replace(/ctrl\+/gi, isMac ? '⌃' : 'Ctrl+')
    .replace(/cmd\+/gi, isMac ? '⌘' : 'Ctrl+')
    .replace(/meta\+/gi, isMac ? '⌘' : 'Win+')
    .replace(/alt\+/gi, isMac ? '⌥' : 'Alt+')
    .replace(/shift\+/gi, isMac ? '⇧' : 'Shift+')
    .replace(/escape/gi, 'Esc')
    .replace(/delete/gi, isMac ? '⌫' : 'Del');
}

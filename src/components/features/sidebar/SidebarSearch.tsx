import React, { useCallback, useImperativeHandle, useRef, forwardRef } from "react";
import { Input, Button } from "@/components/ui";
import { useAppStore } from "@/store/appStore";
import { useSidebarContext } from "./SidebarContext";
import { APP_SHORTCUTS, formatShortcutKey } from "@/lib/keyboard-shortcuts";
import { Search, X } from "lucide-react";

export interface SidebarSearchRef {
  focus: () => void;
}

// Debouncing happens in useSidebarData; this component just writes the query to the store.
export const SidebarSearch = React.memo(forwardRef<SidebarSearchRef>((_, ref) => {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const { contextConfig } = useSidebarContext();
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  const handleClear = useCallback(() => {
    setSearchQuery("");
    inputRef.current?.focus();
  }, [setSearchQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" && searchQuery) {
        e.preventDefault();
        handleClear();
      }
    },
    [searchQuery, handleClear]
  );

  const placeholder = `Search ${contextConfig.label.toLowerCase()}...`;

  return (
    <div className="p-6 border-b border-rune/20">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone pointer-events-none"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          id="sidebar-search"
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="search-medieval pl-10 pr-10"
          aria-label={placeholder}
          autoComplete="off"
          spellCheck="false"
          title={`Search (${formatShortcutKey(APP_SHORTCUTS.SEARCH)})`}
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-stone hover:text-leather transition-colors"
            onClick={handleClear}
            aria-label="Clear search"
            title="Clear search (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}));

SidebarSearch.displayName = "SidebarSearch";

import React, { Suspense, useCallback, useRef } from "react";
import { AppHeader } from "./AppHeader";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useKeyboardShortcut, APP_SHORTCUTS } from "@/lib/keyboard-shortcuts";
import type { SidebarSearchRef } from "@/components/features/sidebar/Sidebar";

// Lazy load Sidebar since it's not critical for LCP
const Sidebar = React.lazy(() =>
  import("@/components/features/sidebar/Sidebar").then(m => ({ default: m.Sidebar }))
);

export const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isTocOpen, setIsTocOpen] = React.useState(false);
  const searchRef = useRef<SidebarSearchRef>(null);

  useKeyboardShortcut(
    APP_SHORTCUTS.SEARCH,
    useCallback(() => {
      setIsTocOpen(true);
      // Small delay to ensure sidebar is rendered before focusing
      setTimeout(() => {
        searchRef.current?.focus();
      }, 100);
    }, []),
    { description: "Open search" }
  );

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Suspense fallback={null}>
        <Sidebar ref={searchRef} isOpen={isTocOpen} onClose={() => setIsTocOpen(false)} />
      </Suspense>
      <AppHeader onTocOpen={() => setIsTocOpen(true)} />

      <div className="flex-1 overflow-auto relative [overflow-anchor:none]">
        <ErrorDisplay />
        <main className="p-4 sm:p-6 md:p-8">
          <div className="codex-page min-h-full">
            <ErrorBoundary level="component">
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

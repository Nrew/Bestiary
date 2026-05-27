import React, { Suspense, useCallback, useLayoutEffect, useRef } from "react";
import { AppHeader } from "./AppHeader";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useAppStore } from "@/store/appStore";
import { useKeyboardShortcut, APP_SHORTCUTS } from "@/lib/keyboard-shortcuts";

// Lazy load Sidebar since it's not critical for LCP
const Sidebar = React.lazy(() =>
  import("@/components/features/sidebar/Sidebar").then(m => ({ default: m.Sidebar }))
);

export function Layout({ children }: React.PropsWithChildren) {
  const [isTocOpen, setIsTocOpen] = React.useState(false);
  const [autoFocusSearch, setAutoFocusSearch] = React.useState(false);
  const selectedId = useAppStore((s) => s.selectedId);
  const navigationNonce = useAppStore((s) => s.navigationNonce);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scroller = contentScrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = 0;
  }, [selectedId, navigationNonce]);

  const openTocFromHeader = useCallback(() => {
    setAutoFocusSearch(false);
    setIsTocOpen(true);
  }, []);

  useKeyboardShortcut(
    APP_SHORTCUTS.SEARCH,
    useCallback(() => {
      setAutoFocusSearch(true);
      setIsTocOpen(true);
    }, []),
    { description: "Open search" }
  );

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Suspense fallback={null}>
        <Sidebar
          isOpen={isTocOpen}
          onClose={() => setIsTocOpen(false)}
          autoFocusSearch={autoFocusSearch}
        />
      </Suspense>
      <AppHeader onTocOpen={openTocFromHeader} />

      <div
        ref={contentScrollRef}
        className="flex-1 overflow-auto relative [overflow-anchor:none]"
      >
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
}

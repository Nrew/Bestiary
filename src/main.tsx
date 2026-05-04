import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import "./index.css";
import { useAppStore } from "./store/appStore";
import { TooltipProvider } from "./components/ui/tooltip";
import { WikiLinkProvider } from "./components/shared/wiki-link/WikiLinkProvider";
import { useBackendInitialization } from "./hooks/useBackendInitialization";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { ToastProvider, setGlobalToastHandler, useToast } from "./components/ui/toast";
import { initKeyboardManager, cleanupKeyboardManager } from "./lib/keyboard-shortcuts";
import { disposeAllCaches } from "./lib/cache";
import { tryCatch } from "./lib/errors";
import { logger } from "./lib/logger";

const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
    <div className="relative">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <div className="absolute inset-0 h-12 w-12 animate-pulse rounded-full border-4 border-primary/20" />
    </div>
    <p className="mt-6 text-sm text-muted-foreground font-medium">Initializing Bestiary...</p>
    <p className="mt-1 text-xs text-muted-foreground/60">Loading compendium database</p>
  </div>
);

const ErrorScreen: React.FC<{ error: string; canRetry: boolean; onRetry: () => void }> = ({
  error,
  canRetry,
  onRetry,
}) => (
  <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
    <div className="text-center max-w-md">
      <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-destructive text-2xl">⚠</span>
      </div>
      <h2 className="text-lg font-semibold mb-3">Startup Issue</h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{error}</p>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onRetry}
          disabled={!canRetry}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canRetry ? "Retry Startup" : "Retry Unavailable"}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/90 transition-colors"
        >
          Reload Application
        </button>
      </div>
    </div>
  </div>
);

// Shown when safeInvoke dispatches a `backend-panic` event mid-session.
// Reload is the fix; it re-spawns the Tauri backend process.
const BackendCrashBanner: React.FC = () => (
  <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background/95 backdrop-blur p-6">
    <div className="text-center max-w-md">
      <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-destructive text-2xl">⚠</span>
      </div>
      <h2 className="text-lg font-semibold mb-3">Backend Crashed</h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        The application backend has crashed. Please restart the application to continue.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Reload
      </button>
    </div>
  </div>
);

const AppInitializer: React.FC = () => {
  const initialize = useAppStore((s) => s.initialize);
  const setError = useAppStore((s) => s.setError);
  const { status, error, retry, gameEnums, canRetry } = useBackendInitialization();
  const [appInitialized, setAppInitialized] = React.useState(false);
  // Set when safeInvoke dispatches a `backend-panic` event; means the
  // Rust backend died mid-session and no further IPC will succeed.
  const [backendCrashed, setBackendCrashed] = React.useState(false);

  React.useEffect(() => {
    tryCatch(
      () => initKeyboardManager(),
      { onError: (err) => logger.error('Failed to initialize keyboard shortcuts:', err) }
    );

    return () => {
      tryCatch(
        () => {
          cleanupKeyboardManager();
          disposeAllCaches();
        },
        { onError: (err) => logger.error('Error during cleanup:', err) }
      );
    };
  }, []);

  // Listen for mid-session backend panics surfaced by api.ts safeInvoke.
  React.useEffect(() => {
    const handlePanic = (e: Event) => {
      const detail: unknown = e instanceof CustomEvent ? e.detail : undefined;
      logger.error('Backend panic event received:', detail);
      setBackendCrashed(true);
    };
    window.addEventListener('backend-panic', handlePanic);
    return () => window.removeEventListener('backend-panic', handlePanic);
  }, []);

  React.useEffect(() => {
    if (status === "ready" && !appInitialized && gameEnums) {
      initialize(gameEnums)
        .then(() => setAppInitialized(true))
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Initialization failed";
          setError(`Startup error: ${message}`);
          setAppInitialized(true);
        });
    }
  }, [status, appInitialized, gameEnums, initialize, setError]);

  if (backendCrashed) {
    return <BackendCrashBanner />;
  }

  if (status === "error") {
    return <ErrorScreen error={error || "Unknown error"} canRetry={canRetry} onRetry={retry} />;
  }

  if (status !== "ready" || !appInitialized) {
    return <LoadingScreen />;
  }

  return <App />;
};

const ToastSetup: React.FC = () => {
  const toastHandler = useToast();
  React.useEffect(() => {
    setGlobalToastHandler(toastHandler);
  }, [toastHandler]);
  return null;
};

const AppProviders: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ToastProvider>
    <ToastSetup />
    <TooltipProvider delayDuration={100}>
      <WikiLinkProvider>{children}</WikiLinkProvider>
    </TooltipProvider>
  </ToastProvider>
);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <ErrorBoundary level="app">
        <AppProviders>
          <AppInitializer />
        </AppProviders>
      </ErrorBoundary>
    </MotionConfig>
  </React.StrictMode>
);

import { useState, useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import type { GameEnums } from "@/types";
import { RETRY } from "@/lib/dnd/constants";
import { getAppReady } from "@/lib/api";

// Circuit breaker constants
const MAX_RETRIES = RETRY.MAX_ATTEMPTS;
const INITIAL_BACKOFF_MS = RETRY.INITIAL_BACKOFF;
const MAX_BACKOFF_MS = RETRY.MAX_BACKOFF;

interface BackendState {
  status: "connecting" | "ready" | "error";
  error?: string;
  gameEnums?: GameEnums;
  retryCount: number;
  canRetry: boolean;
}

// Circuit breaker: retries with exponential backoff up to MAX_RETRIES.
export const useBackendInitialization = (): BackendState & { retry: () => void } => {
  const [state, setState] = useState<BackendState>({
    status: "connecting",
    retryCount: 0,
    canRetry: true,
  });

  // Track if a request is currently in-flight to prevent double-requests
  const isRequestInFlight = useRef(false);
  const isMounted = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performInit = useCallback(async (retryCount: number) => {
    // Prevent concurrent requests
    if (isRequestInFlight.current) return;
    isRequestInFlight.current = true;

    try {
      const enums = await getAppReady();
      if (isMounted.current) {
        setState({
          status: "ready",
          gameEnums: enums,
          retryCount: 0,
          canRetry: true,
        });
      }
    } catch (error) {
      if (isMounted.current) {
        const message = error instanceof Error ? error.message : "Backend connection failed";
        const newRetryCount = retryCount + 1;
        const canRetry = newRetryCount < MAX_RETRIES;

        setState({
          status: "error",
          error: canRetry
            ? `${message} (attempt ${newRetryCount}/${MAX_RETRIES})`
            : `${message}. Maximum retry attempts reached.`,
          retryCount: newRetryCount,
          canRetry,
        });
      }
    } finally {
      isRequestInFlight.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    if (!state.canRetry || isRequestInFlight.current) return;

    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const backoffMs = Math.min(
      INITIAL_BACKOFF_MS * Math.pow(2, state.retryCount),
      MAX_BACKOFF_MS
    );

    setState((prev) => ({ ...prev, status: "connecting", error: undefined }));

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (isMounted.current) void performInit(state.retryCount);
    }, backoffMs);
  }, [state.canRetry, state.retryCount, performInit]);

  useEffect(() => {
    isMounted.current = true;
    void performInit(0);

    const unlistenPromise = listen<string>("backend-error", (event) => {
      if (!isMounted.current) return;
      setState({
        status: "error",
        error: event.payload,
        retryCount: MAX_RETRIES,
        canRetry: false,
      });
    });

    return () => {
      isMounted.current = false;
      if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [performInit]);

  return { ...state, retry };
};

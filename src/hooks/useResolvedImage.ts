import { useState, useEffect } from "react";
import { resolveImageUrl } from "@/lib/api";
import { getLogger } from "@/lib/logger";

const log = getLogger("useResolvedImage");

interface ResolvedImageState {
  url: string | null;
  failed: boolean;
}

/**
 * Resolves a managed image filename to a safe asset:// URL via the backend.
 * Re-runs whenever `filename` changes. Cancels in-flight requests on cleanup.
 */
export function useResolvedImage(filename: string | null | undefined): ResolvedImageState {
  const [state, setState] = useState<ResolvedImageState>({ url: null, failed: false });

  useEffect(() => {
    if (!filename) {
      setState({ url: null, failed: true });
      return;
    }

    let cancelled = false;
    setState({ url: null, failed: false });

    resolveImageUrl(filename)
      .then((url) => {
        if (!cancelled) setState({ url, failed: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        log.warn("Failed to resolve managed image:", filename, err);
        setState({ url: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [filename]);

  return state;
}

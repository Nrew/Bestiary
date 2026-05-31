import { useState, useCallback, useRef, useEffect } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

export interface CopyState {
  copied: boolean;
  error: string | null;
}

export function useCopyToClipboard(
  resetDelay: number = 2000
): [CopyState, (text: string) => Promise<void>] {
  const [state, setState] = useState<CopyState>({
    copied: false,
    error: null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        const success = await copyToClipboard(text);

        if (success) {
          setState({ copied: true, error: null });

          timeoutRef.current = setTimeout(() => {
            setState({ copied: false, error: null });
            timeoutRef.current = null;
          }, resetDelay);
        } else {
          setState({ copied: false, error: 'Failed to copy' });
        }
      } catch (error) {
        setState({
          copied: false,
          error: error instanceof Error ? error.message : 'Failed to copy',
        });
      }
    },
    [resetDelay]
  );

  return [state, copy];
}

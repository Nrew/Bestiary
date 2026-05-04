/**
 * Schedule a callback during browser idle time, falling back to a zero-delay
 * setTimeout when requestIdleCallback is unavailable (e.g. some Tauri WebViews).
 * Returns a cancel function.
 */
export function scheduleIdle(cb: () => void, timeout: number): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const handle = requestIdleCallback(cb, { timeout });
    return () => cancelIdleCallback(handle);
  }
  const id = setTimeout(cb, 0);
  return () => clearTimeout(id);
}

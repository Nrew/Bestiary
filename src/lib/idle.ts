export function scheduleIdle(cb: () => void, timeout: number): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const handle = requestIdleCallback(cb, { timeout });
    return () => cancelIdleCallback(handle);
  }
  const id = setTimeout(cb, timeout);
  return () => clearTimeout(id);
}

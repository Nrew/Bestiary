import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("scheduleIdle", () => {
  const originalRic = globalThis.requestIdleCallback;
  const originalCancelRic = globalThis.cancelIdleCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    // Remove requestIdleCallback so the setTimeout fallback path runs.
    // Use `as never` to satisfy strict global typing.
    (globalThis as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback = undefined;
    (globalThis as { cancelIdleCallback?: typeof cancelIdleCallback }).cancelIdleCallback = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback = originalRic;
    (globalThis as { cancelIdleCallback?: typeof cancelIdleCallback }).cancelIdleCallback = originalCancelRic;
  });

  it("honors the timeout argument in the setTimeout fallback", async () => {
    const { scheduleIdle } = await import("./idle");
    const cb = vi.fn();

    scheduleIdle(cb, 250);

    // Just before the timeout: callback should not have fired yet.
    vi.advanceTimersByTime(249);
    expect(cb).not.toHaveBeenCalled();

    // At the timeout: callback fires.
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("returns a cancel function that clears the pending fallback timer", async () => {
    const { scheduleIdle } = await import("./idle");
    const cb = vi.fn();

    const cancel = scheduleIdle(cb, 500);
    cancel();

    // Advance well past the requested timeout: callback must not fire.
    vi.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
  });
});
